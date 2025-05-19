import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalUrl: {
    type: String,
    required: true,
  },
  transformedUrl: {
    type: String,
    required: true,
  },
  style: {
    type: String,
    required: true,
    enum: ['ghibli', 'watercolor', 'comic', 'anime'],
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
  },
  metadata: {
    originalSize: Number,
    transformedSize: Number,
    width: Number,
    height: Number,
    format: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better query performance
imageSchema.index({ userId: 1, createdAt: -1 });
imageSchema.index({ status: 1 });

export default mongoose.models.Image || mongoose.model('Image', imageSchema); 