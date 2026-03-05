const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { processVideo } = require('./process');

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
});

console.log('Worker starting up...');

const worker = new Worker('video-processing', async job => {
  console.log(`Processing job ${job.id} for video: ${job.data.videoId}`);
  try {
    const result = await processVideo(job);
    console.log(`Job ${job.id} completed successfully`);
    return result; // This is stored as job.returnvalue in BullMQ
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    throw error;
  }
}, { 
  connection,
  lockDuration: 600000 // 10 minutes lock to avoid stalls on slow chunks
});

worker.on('ready', () => {
    console.log('Worker is ready and listening for jobs!');
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error: ${err.message}`);
});

process.on('SIGTERM', async () => {
  console.log('Gracefully shutting down worker...');
  await worker.close();
  process.exit(0);
});
