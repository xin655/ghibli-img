import mongoose from 'mongoose';
import { CONFIG } from '../config/constants';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
    required: true,
  },
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  subscription: {
    status: {
      type: String,
      enum: ['free', 'active', 'cancelled', 'expired'],
      default: 'free',
    },
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free',
    },
    startDate: Date,
    endDate: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
  },
  usage: {
    freeTrialsRemaining: {
      type: Number,
      default: CONFIG.FREE_TRIAL.AUTHENTICATED_USER_LIMIT,
    },
    totalTransformations: {
      type: Number,
      default: 0,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User || mongoose.model('User', userSchema); 