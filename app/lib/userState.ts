import connectDB from '@/app/lib/db';
import User from '@/app/models/User'; // Import the Mongoose User model
import { Document, Types } from 'mongoose'; // Import Document and Types for typing

const FREE_TRIAL_LIMIT = 100; // 免费试用次数限制

// Define an interface for the User document structure
interface IUserDocument extends Document {
  _id: Types.ObjectId;
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

// Define an interface for the lean user document
interface IUserLean {
  _id: Types.ObjectId;
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

// Refine UserState interface to match the structure returned by our functions
// It should represent the _state_ fields we expose/use in the app
export interface UserState {
  _id?: string; // MongoDB document ID string
  userId: string; // Google user ID (payload.sub), mapped from googleId
  email: string;
  freeTrialCount: number; // Mapped from usage.freeTrialsRemaining
  isSubscribed: boolean; // Mapped from subscription.status
  // Include other relevant state fields if necessary
  subscriptionStatus?: 'free' | 'active' | 'cancelled' | 'expired'; // Directly expose status if needed
  totalTransformations?: number; // Directly expose total transformations if needed
}

// Helper function to convert user document to UserState
function userToUserState(user: IUserDocument | IUserLean): UserState {
  return {
    _id: user._id.toString(),
    userId: user.googleId,
    email: user.email,
    freeTrialCount: Math.min(user.usage?.freeTrialsRemaining ?? 0, FREE_TRIAL_LIMIT),
    isSubscribed: user.subscription?.status === 'active',
    subscriptionStatus: user.subscription?.status,
    totalTransformations: user.usage?.totalTransformations ?? 0,
  };
}

export async function getUserState(userId: string): Promise<UserState | null> {
  await connectDB(); // Ensure DB connection
  
  const user = await User.findOne<IUserDocument>({ googleId: userId }).lean<IUserLean>();
  
  if (!user) {
    return null; // User not found, return null
  }

  // If user exists, check and update free trials if necessary
  if (user.usage.freeTrialsRemaining < FREE_TRIAL_LIMIT) {
    // Need to fetch the non-lean document to update and save.
    const fullUser = await User.findOne<IUserDocument>({ googleId: userId });
    if (fullUser) {
      fullUser.usage.freeTrialsRemaining = FREE_TRIAL_LIMIT;
      await fullUser.save();
      // Fetch again as lean to return consistent format
      const updatedUser = await User.findOne<IUserDocument>({ googleId: userId }).lean<IUserLean>();
      return updatedUser ? userToUserState(updatedUser) : null; // Return updated state or null if re-fetch fails
    } else {
      // Should not happen if user was found initially, but handle defensively
      console.error(`User ${userId} found lean but not in full fetch for update.`);
      return userToUserState(user); // Return existing lean user state
    }
  } else {
    // No update needed, return existing lean user state
    return userToUserState(user);
  }
}

// Update createUserState to create a User document and return UserState
// Need name and photo here as they are required in the User model schema
export async function createUserState(userId: string, email: string, name: string, photo: string): Promise<UserState> {
  await connectDB(); // Ensure DB connection

  // Check if user already exists to prevent duplicates
  let user = await User.findOne<IUserDocument>({ googleId: userId });
  if (user) {
    if (user.usage.freeTrialsRemaining < FREE_TRIAL_LIMIT) {
      user.usage.freeTrialsRemaining = FREE_TRIAL_LIMIT;
      await user.save();
    }
    return userToUserState(user);
  }

  // Create a new user document. Mongoose applies schema defaults.
  const newUser = await User.create({
    googleId: userId,
    email: email,
    name: name,
    photo: photo,
    // subscription and usage will get defaults from schema (freeTrialsRemaining will be 100)
  });

   // Return the state of the newly created user
   return userToUserState(newUser);
}

export async function incrementFreeTrialCount(userId: string): Promise<UserState> {
  await connectDB();

  // Find the user document by MongoDB _id
  const user = await User.findOne<IUserDocument>({
    _id: new Types.ObjectId(userId),
    $or: [
      { 'usage.freeTrialsRemaining': { $gt: 0 } },
      { 'subscription.status': 'active' }
    ]
  });
  
  if (!user) {
    // If user not found under these conditions, either user doesn't exist, 
    // or they have no free trials left and are not subscribed.
    // We should fetch the user anyway to return their current state if they exist but are at limit.
     const existingUser = await User.findOne<IUserDocument>({ _id: new Types.ObjectId(userId) }).lean<IUserLean>();
     if(existingUser) {
        // User exists but is at limit/not subscribed, return their state without modification
         return userToUserState(existingUser);
     } else {
         // User not found at all (unexpected if called after auth, but handle defensively)
         throw new Error('User not found');
     }
  }

  if (user.subscription?.status === 'active') {
    user.usage.totalTransformations += 1;
  } else if (user.usage.freeTrialsRemaining > 0) {
    user.usage.freeTrialsRemaining -= 1;
    user.usage.totalTransformations += 1;
  } else {
    return userToUserState(user);
  }

  await user.save();
  return userToUserState(user);
}

export async function canTransformImage(userId: string): Promise<{ canTransform: boolean; reason?: string }> {
  await connectDB();

  // Find user by MongoDB _id
  const user = await User.findOne<IUserDocument>({ _id: new Types.ObjectId(userId) });
  if (!user) {
    return { canTransform: false, reason: 'User not found' };
  }

  // If user has an active subscription, they can transform
  if (user.subscription?.status === 'active') {
    return { canTransform: true };
  }

  // If user has free trials remaining, they can transform
  if (user.usage?.freeTrialsRemaining > 0) {
    return { canTransform: true };
  }

  // User has no free trials and no active subscription
  return { 
    canTransform: false, 
    reason: 'No free trials remaining. Please subscribe to continue transforming images.' 
  };
}

// You might also need functions for subscription updates, etc., 
// which would also operate on the User model. 