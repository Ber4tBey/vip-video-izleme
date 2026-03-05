const { Queue, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');
const db = require('../database');

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
});

const videoQueue = new Queue('video-processing', { connection });
const queueEvents = new QueueEvents('video-processing', { connection });

// Listen for worker progress and completions to update database
queueEvents.on('completed', async ({ jobId }) => {
  try {
    const job = await videoQueue.getJob(jobId);
    if (job && job.data.videoId) {
      const videoIdStr = job.data.videoId;
      const url = `/uploads/videos/${videoIdStr}/stream.m3u8`;
      const returnValue = job.returnvalue || {};
      const thumbnailUrl = returnValue.thumbnailUrl || null;
      const previewUrl = returnValue.previewUrl || null;
      await db.query(
        "UPDATE videos SET url = $1, thumbnail_url = $3, preview_url = $4, job_status = 'completed', job_progress = 100 WHERE id = $2",
        [url, videoIdStr, thumbnailUrl, previewUrl]
      );
      console.log(`[QueueEvents] Marked video ${videoIdStr} as completed. Thumbnail: ${thumbnailUrl}`);
    }
  } catch(err) {
    console.error('[QueueEvents] completed error:', err);
  }
});

queueEvents.on('progress', async ({ jobId, data }) => {
  try {
    const job = await videoQueue.getJob(jobId);
    if (job && job.data.videoId && typeof data === 'number') {
      await db.query(
        "UPDATE videos SET job_progress = $1, job_status = 'processing' WHERE id = $2",
        [data, job.data.videoId]
      );
    }
  } catch(err) {
    console.error('[QueueEvents] progress error:', err);
  }
});

queueEvents.on('failed', async ({ jobId }) => {
  try {
    const job = await videoQueue.getJob(jobId);
    if (job && job.data.videoId) {
      await db.query(
        "UPDATE videos SET job_status = 'failed' WHERE id = $1",
        [job.data.videoId]
      );
      console.log(`[QueueEvents] Marked video ${job.data.videoId} as failed.`);
    }
  } catch(err) {
    console.error('[QueueEvents] failed error:', err);
  }
});

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
