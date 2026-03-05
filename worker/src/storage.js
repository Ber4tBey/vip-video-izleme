const Minio = require('minio');
const fs = require('fs');
const path = require('path');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'admin123'
});

async function downloadFile(bucketName, objectName, destPath) {
  return new Promise((resolve, reject) => {
    minioClient.fGetObject(bucketName, objectName, destPath, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function uploadDir(bucketName, sourceDir, prefixKey) {
  const files = fs.readdirSync(sourceDir);
  
  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const objectName = `${prefixKey}/${file}`;
    let contentType = 'application/octet-stream';
    if (file.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
    if (file.endsWith('.ts')) contentType = 'video/MP2T';
                        
    await new Promise((resolve, reject) => {
      minioClient.fPutObject(bucketName, objectName, filePath, { 'Content-Type': contentType }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

async function deleteFile(bucketName, objectName) {
  return new Promise((resolve, reject) => {
    minioClient.removeObject(bucketName, objectName, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function uploadFile(bucketName, objectName, filePath) {
  let contentType = 'application/octet-stream';
  if (objectName.endsWith('.jpg') || objectName.endsWith('.jpeg')) contentType = 'image/jpeg';
  if (objectName.endsWith('.mp4')) contentType = 'video/mp4';

  return new Promise((resolve, reject) => {
    minioClient.fPutObject(bucketName, objectName, filePath, { 'Content-Type': contentType }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = {
  minioClient,
  downloadFile,
  uploadFile,
  uploadDir,
  deleteFile
};
