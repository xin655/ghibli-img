import mongoose, { Document } from 'mongoose';
import { CONFIG } from '../config/constants';

export interface IUserDocument extends Document {
  email: string;
  name: string;
  photo: string;
  googleId: string;
  subscription: {
    status: 'free' | 'active' | 'cancelled' | 'expired';
    plan: 'free' | 'basic' | 'premium';
    startDate?: Date;
    endDate?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  usage: {
    freeTrialsRemaining: number;
    totalTransformations: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUserDocument>({
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

export default mongoose.models.User as mongoose.Model<IUserDocument> || mongoose.model<IUserDocument>('User', userSchema); 