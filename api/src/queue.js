const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
});

const videoQueue = new Queue('video-processing', { connection });

async function addVideoJob(jobData) {
  return await videoQueue.add('encode', jobData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

async function getJobStatus(videoId) {
  // Find jobs associated with this videoId (usually stored in job.data)
  // BullMQ doesn't natively index by job data, so we'll fetch active/waiting
  const statuses = ['active', 'waiting', 'completed', 'failed', 'delayed'];
  const jobs = await videoQueue.getJobs(statuses);
  
  const job = jobs.find(j => j.data.videoId === videoId);
  return job;
}

async function getActiveJobs() {
  const statuses = ['active', 'waiting', 'delayed'];
  const jobs = await videoQueue.getJobs(statuses);
  return jobs.map(j => ({
    videoId: j.data.videoId,
    progress: j.progress || 0,
    status: j.finishedOn ? 'completed' : (j.processedOn ? 'active' : 'waiting')
  }));
}

module.exports = {
  addVideoJob,
  getJobStatus,
  getActiveJobs
};
