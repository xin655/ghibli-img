import mongoose, { Document, Types } from 'mongoose';
import { CONFIG } from '../config/constants';

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  photo: string;
  googleId: string;
  isAdmin?: boolean;
  usage: {
    freeTrialsRemaining: number;
    totalTransformations: number;
  };
  subscription?: {
    plan?: 'free' | 'basic' | 'pro' | 'enterprise';
    isActive: boolean;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
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
    default: '',
  },
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
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
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    stripeCustomerId: {
      type: String,
    },
    stripeSubscriptionId: {
      type: String,
    },
    currentPeriodEnd: {
      type: Date,
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
  lastLoginAt: Date,
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User as mongoose.Model<IUserDocument> || mongoose.model<IUserDocument>('User', userSchema); 