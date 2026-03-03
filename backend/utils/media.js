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
      '00:00:01.500',
      '-i',
      videoAbsolutePath,
      '-frames:v',
      '1',
      '-vf',
      'scale=640:-2',
      '-q:v',
      '5',
      thumbnailAbsolutePath,
    ],
    { windowsHide: true, stdio: 'ignore' }
  );

  return result.status === 0 && fileExists(thumbnailAbsolutePath);
};

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
  getVideoMimeType,
};
