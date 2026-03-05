const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const storage = require('./storage');
const queue = require('./queue');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Set up multer for temporary storage
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

app.post('/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  try {
    const videoId = uuidv4();
    const originalName = req.file.originalname;
    const filePath = req.file.path;
    const extension = path.extname(originalName);

    // Upload to MinIO (raw-videos bucket)
    const objectName = `${videoId}${extension}`;
    await storage.uploadFile('raw-videos', objectName, filePath);
    
    // Remove temp file
    fs.unlinkSync(filePath);

    // Add job to Redis queue for processing
    await queue.addVideoJob({
      videoId,
      objectName,
      originalName
    });

    res.status(202).json({
      message: 'Video upload successful. Processing started.',
      videoId
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Internal server error during upload.' });
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Get Video Processing Status
app.get('/status/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const job = await queue.getJobStatus(videoId);
    
    if (!job) {
      // If no active job, check if it's already in MinIO
      const videos = await storage.listVideos();
      if (videos.includes(videoId)) {
        return res.json({ status: 'completed', videoId });
      }
      return res.status(404).json({ error: 'Video not found or job expired' });
    }

    const state = await job.getState();
    const progress = job.progress || 0;
    res.json({ status: state, progress, videoId });

  } catch (error) {
    console.error('Status Error:', error);
    res.status(500).json({ error: 'Internal server error while fetching status' });
  }
});

// List all uploaded/completed and active videos
app.get('/videos', async (req, res) => {
  try {
    const completedVideos = await storage.listVideos();
    const activeJobs = await queue.getActiveJobs();
    
    // Map completed videos to a standard format
    const formattedCompleted = completedVideos.map(videoId => ({
      videoId,
      status: 'completed',
      progress: 100
    }));

    // Filter out active jobs that might have just completed and appeared in MinIO
    const filteredActive = activeJobs.filter(job => !completedVideos.includes(job.videoId));

    const combinedVideos = [...filteredActive, ...formattedCompleted];
    res.json({ videos: combinedVideos });
  } catch (error) {
    console.error('List Error:', error);
    res.status(500).json({ error: 'Internal server error while fetching videos' });
  }
});

// Delete a video and its segments
app.delete('/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    await storage.deleteVideo(videoId);
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Initialize storage buckets and start server
async function start() {
  await storage.initializeBuckets();
  app.listen(port, () => {
    console.log(`API Server listening on port ${port}`);
  });
}

start();
