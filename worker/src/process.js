const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const storage = require('./storage');

async function processVideo(job) {
  const data = job.data;
  const { videoId, objectName } = data;
  const tempDir = path.join(__dirname, '../temp', videoId);
  const inputPath = path.join(tempDir, objectName);
  const outputDir = path.join(tempDir, 'output');

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`Downloading ${objectName} from MinIO...`);
    await storage.downloadFile('raw-videos', objectName, inputPath);

    // Get video duration first
    const duration = await getVideoDuration(inputPath);
    console.log(`Video duration: ${duration}s`);

    // 1. Extract thumbnail JPEG at 25% of duration
    const thumbnailPath = path.join(tempDir, 'thumbnail.jpg');
    await extractFrame(inputPath, duration * 0.25, thumbnailPath);
    console.log(`Extracted thumbnail for ${videoId}`);

    // 2. Extract short preview MP4 (3 x 2s clips from 10%, 50%, 80%)
    const previewPath = path.join(tempDir, 'preview.mp4');
    await extractPreviewClip(inputPath, duration, previewPath);
    console.log(`Extracted preview clip for ${videoId}`);

    // 3. Convert to HLS
    console.log(`Starting FFmpeg HLS conversion for ${videoId}...`);
    await convertToHLS(job, inputPath, outputDir);

    // 4. Upload HLS + thumbnail + preview to MinIO
    console.log(`Uploading HLS files for ${videoId} to MinIO...`);
    await storage.uploadDir('hls-videos', outputDir, videoId);
    await storage.uploadFile('hls-videos', `${videoId}/thumbnail.jpg`, thumbnailPath);
    await storage.uploadFile('hls-videos', `${videoId}/preview.mp4`, previewPath);

    console.log(`Cleaning up local and RAW files for ${videoId}...`);
    await storage.deleteFile('raw-videos', objectName);
    fs.rmSync(tempDir, { recursive: true, force: true });

    return {
      thumbnailUrl: `/uploads/videos/${videoId}/thumbnail.jpg`,
      previewUrl: `/uploads/videos/${videoId}/preview.mp4`,
    };

  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw error;
  }
}

function getVideoDuration(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata?.format?.duration;
      if (!duration || !Number.isFinite(duration)) return reject(new Error('Invalid duration'));
      resolve(duration);
    });
  });
}

function extractFrame(inputPath, timePos, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(Math.max(0, timePos))
      .outputOptions(['-vframes 1', '-q:v 3', '-vf scale=640:-1'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

function extractPreviewClip(inputPath, duration, outputPath) {
  // 3 clips of ~2s each from 10%, 50%, 80% of the video
  const positions = [0.10, 0.50, 0.80].map(p => Math.max(0, duration * p));
  const clipDuration = Math.min(2, duration / 6);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath).seekInput(positions[0]).inputOptions([`-t ${clipDuration}`])
      .input(inputPath).seekInput(positions[1]).inputOptions([`-t ${clipDuration}`])
      .input(inputPath).seekInput(positions[2]).inputOptions([`-t ${clipDuration}`])
      // Scale MUST be inside complexFilter - cannot mix with -vf outputOption
      .complexFilter([
        '[0:v]scale=480:-2[v0]',
        '[1:v]scale=480:-2[v1]',
        '[2:v]scale=480:-2[v2]',
        '[v0][v1][v2]concat=n=3:v=1[outv]',
      ])
      .outputOptions([
        '-map [outv]',
        '-c:v libx264',
        '-preset ultrafast',
        '-b:v 300k',
        '-an',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

function convertToHLS(job, inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-preset ultrafast',
        '-threads 0',
        '-g 48',
        '-sc_threshold 0',
        '-vf scale=w=1280:h=720:force_original_aspect_ratio=decrease',
        '-c:v libx264',
        '-b:v 2800k',
        '-c:a aac',
        '-b:a 128k',
        '-f hls',
        '-hls_time 4',
        '-hls_playlist_type vod',
        '-hls_flags independent_segments',
        '-hls_segment_type mpegts',
        '-hls_segment_filename', path.join(outputDir, 'stream_data%03d.ts'),
        '-master_pl_name', 'master.m3u8',
        '-var_stream_map', 'v:0,a:0'
      ])
      .output(path.join(outputDir, 'stream.m3u8'))
      .on('progress', async (progress) => {
        if (progress.percent !== undefined) {
          const percent = Math.round(progress.percent);
          console.log(`FFmpeg Progress: ${percent}% done`);
          await job.updateProgress(percent).catch(() => {});
        } else {
          console.log(`FFmpeg Processing... (Frames: ${progress.frames})`);
        }
      })
      .on('stderr', (stderrLine) => {
        console.log('FFmpeg: ' + stderrLine);
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

module.exports = { processVideo };
