const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'admin123'
});

async function initializeBuckets() {
  const buckets = ['raw-videos', 'hls-videos', 'assets'];
  for (const bucket of buckets) {
    const exists = await minioClient.bucketExists(bucket).catch(() => false);
    if (!exists) {
      try {
        await minioClient.makeBucket(bucket);
        console.log(`Bucket ${bucket} created successfully.`);
        
        // Make hls-videos and assets publicly readable
        if (bucket === 'hls-videos' || bucket === 'assets') {
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucket}/*`]
              }
            ]
          };
          await minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
        }
      } catch (err) {
        console.error(`Error initializing storage bucket ${bucket}:`, err);
      }
    } else {
        console.log(`Bucket ${bucket} already exists.`);
    }
  }
}

async function uploadFile(bucketName, objectName, filePath) {
  return new Promise((resolve, reject) => {
    minioClient.fPutObject(bucketName, objectName, filePath, {}, (err, objInfo) => {
      if (err) return reject(err);
      resolve(objInfo);
    });
  });
}

async function listVideos() {
  return new Promise((resolve, reject) => {
    const videoIds = new Set();
    const stream = minioClient.listObjectsV2('hls-videos', '', true);
    
    stream.on('data', function(obj) {
      const parts = obj.name.split('/');
      if (parts.length > 0 && parts[0]) {
        videoIds.add(parts[0]);
      }
    });
    
    stream.on('end', function() {
      resolve(Array.from(videoIds));
    });
    
    stream.on('error', function(err) {
      reject(err);
    });
  });
}

async function deleteVideo(videoId) {
  // 1. Get and delete HLS objects
  const hlsObjects = [];
  const hlsStream = minioClient.listObjectsV2('hls-videos', videoId + '/', true);
  await new Promise((resolve, reject) => {
    hlsStream.on('data', obj => hlsObjects.push(obj.name));
    hlsStream.on('end', () => resolve());
    hlsStream.on('error', err => reject(err));
  });
  
  for (const objName of hlsObjects) {
    await new Promise((resolve, reject) => {
       minioClient.removeObject('hls-videos', objName, (err) => {
         if (err) return reject(err);
         resolve();
       });
    });
  }

  // 2. Get and delete RAW objects
  const rawObjects = [];
  const rawStream = minioClient.listObjectsV2('raw-videos', videoId, true);
  await new Promise((resolve, reject) => {
    rawStream.on('data', obj => rawObjects.push(obj.name));
    rawStream.on('end', () => resolve());
    rawStream.on('error', err => reject(err));
  });

  for (const objName of rawObjects) {
    await new Promise((resolve, reject) => {
       minioClient.removeObject('raw-videos', objName, (err) => {
         if (err) return reject(err);
         resolve();
       });
    });
  }
}

module.exports = {
  minioClient,
  initializeBuckets,
  uploadFile,
  listVideos,
  deleteVideo
};
