const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const imagesDir = path.join(uploadsRoot, 'images');
const videosDir = path.join(uploadsRoot, 'videos');
const thumbnailsDir = path.join(uploadsRoot, 'thumbnails');

const ensureMediaDirs = () => {
  [uploadsRoot, imagesDir, videosDir, thumbnailsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
};

const toAbsoluteUploadPath = (urlPath) => {
  if (!urlPath) return '';
  return path.join(__dirname, '..', urlPath.replace(/^\/+/, ''));
};

const fileExists = (targetPath) => {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
};

const deleteFileIfExists = (targetPath) => {
  try {
    if (fileExists(targetPath)) fs.unlinkSync(targetPath);
  } catch {
    // no-op: cleanup should never break request flow
  }
};

let ffmpegAvailability;
const hasFfmpeg = () => {
  if (typeof ffmpegAvailability === 'boolean') return ffmpegAvailability;
  const check = spawnSync('ffmpeg', ['-version'], { windowsHide: true, stdio: 'ignore' });
  ffmpegAvailability = check.status === 0;
  return ffmpegAvailability;
};

const getThumbnailFileName = (videoFileName) => `${path.parse(videoFileName).name}.jpg`;
const getThumbnailUrl = (videoFileName) => `/uploads/thumbnails/${getThumbnailFileName(videoFileName)}`;

const generateVideoThumbnailSync = (videoAbsolutePath, thumbnailAbsolutePath) => {
  if (!hasFfmpeg()) return false;

  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-ss',
      '00:00:01.250',
      '-i',
      videoAbsolutePath,
      '-frames:v',
      '1',
      '-vf',
      'scale=480:-2',
      '-q:v',
      '7',
      thumbnailAbsolutePath,
    ],
    { windowsHide: true, stdio: 'ignore' }
  );

  return result.status === 0 && fileExists(thumbnailAbsolutePath);
};

const FASTSTART_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v']);

// Rewrites MP4/MOV headers (moov atom to front) for faster mobile start.
const optimizeVideoForStreamingSync = (videoAbsolutePath) => {
  if (!hasFfmpeg()) return false;
  if (!fileExists(videoAbsolutePath)) return false;

  const ext = path.extname(videoAbsolutePath).toLowerCase();
  if (!FASTSTART_EXTENSIONS.has(ext)) return false;

  const tempPath = `${videoAbsolutePath}.faststart${ext}`;
  deleteFileIfExists(tempPath);

  const result = spawnSync(
    'ffmpeg',
    ['-y', '-i', videoAbsolutePath, '-c', 'copy', '-movflags', '+faststart', tempPath],
    { windowsHide: true, stdio: 'ignore' }
  );

  if (result.status !== 0 || !fileExists(tempPath)) {
    deleteFileIfExists(tempPath);
    return false;
  }

  try {
    deleteFileIfExists(videoAbsolutePath);
    fs.renameSync(tempPath, videoAbsolutePath);
    return true;
  } catch {
    deleteFileIfExists(tempPath);
    return false;
  }
};

// Converts uploaded images to compressed JPG (max width 1280).
const optimizeImageForDeliverySync = (imageAbsolutePath) => {
  if (!hasFfmpeg()) return imageAbsolutePath;
  if (!fileExists(imageAbsolutePath)) return imageAbsolutePath;

  const dir = path.dirname(imageAbsolutePath);
  const baseName = path.parse(imageAbsolutePath).name;
  const finalPath = path.join(dir, `${baseName}.jpg`);
  const tempPath = path.join(dir, `${baseName}.optimized.jpg`);

  deleteFileIfExists(tempPath);

  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      imageAbsolutePath,
      '-vf',
      'scale=min(1280\\,iw):-2',
      '-q:v',
      '4',
      tempPath,
    ],
    { windowsHide: true, stdio: 'ignore' }
  );

  if (result.status !== 0 || !fileExists(tempPath)) {
    deleteFileIfExists(tempPath);
    return imageAbsolutePath;
  }

  try {
    if (finalPath !== imageAbsolutePath) deleteFileIfExists(imageAbsolutePath);
    if (finalPath !== tempPath) deleteFileIfExists(finalPath);
    fs.renameSync(tempPath, finalPath);
    return finalPath;
  } catch {
    deleteFileIfExists(tempPath);
    return imageAbsolutePath;
  }
};

const imagePathToUrl = (imageAbsolutePath) => `/uploads/images/${path.basename(imageAbsolutePath)}`;

const getVideoMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.ogg':
    case '.ogv':
      return 'video/ogg';
    case '.mov':
      return 'video/quicktime';
    case '.m4v':
      return 'video/x-m4v';
    case '.mkv':
      return 'video/x-matroska';
    default:
      return 'application/octet-stream';
  }
};

module.exports = {
  uploadsRoot,
  imagesDir,
  videosDir,
  thumbnailsDir,
  ensureMediaDirs,
  toAbsoluteUploadPath,
  deleteFileIfExists,
  getThumbnailFileName,
  getThumbnailUrl,
  generateVideoThumbnailSync,
  optimizeVideoForStreamingSync,
  optimizeImageForDeliverySync,
  imagePathToUrl,
  getVideoMimeType,
};
