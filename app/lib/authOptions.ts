import { AuthOptions, Session, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { kv } from "@vercel/kv";
import { UserProfile } from "@/app/profile/page"; // Assuming UserProfile matches KV structure
import { JWT } from "next-auth/jwt";
import connectDB from "@/app/lib/db";
import UserCollection, { IUserDocument } from "@/app/models/User"; // Rename User import to avoid conflict
import { HydratedDocument } from "mongoose";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // 你可以在这里添加更多 provider
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user, account, profile }: { token: JWT; user?: User; account?: any; profile?: any }) {
      console.log('Server: JWT Callback - Initial Token:', token);
      console.log('Server: JWT Callback - User:', user);
      console.log('Server: JWT Callback - Account:', account);

      // Add user data to the token on initial sign-in
      if (account && user) {
        try {
          // We need to fetch the user from MongoDB using googleId to get the _id
          await connectDB(); // Ensure DB connection
          // Use UserCollection (the Mongoose model) here
          const existingUser = await UserCollection.findOne<IUserDocument>({ googleId: user.id }); // Use user.id from next-auth
          
          let userState;
          if (existingUser) {
             userState = await kv.get<UserProfile>(`user:${existingUser.email}`); // Fetch from KV using email from MongoDB
          } else if (user.email) {
             // Fallback to fetching from KV using email from next-auth if MongoDB user not found (shouldn't happen if using googleId as unique identifier)
             userState = await kv.get<UserProfile>(`user:${user.email}`);
          }

          console.log('Server: JWT Callback - UserState from KV (initial sign-in):', userState);
          
          // Spread userState only if it's a valid object and add MongoDB _id as string
          return { ...token, id: existingUser?._id?.toString() || user.id, ...(userState || {}) }; // Use MongoDB _id if available, otherwise user.id
        } catch (error) {
            console.error('Server: Error fetching userState or user in JWT callback (initial sign-in):', error);
             return { ...token, id: user.id }; // Return token with user id even if KV/DB fetch fails
        }
      }

      // Subsequent sessions, fetch latest user state to keep token updated
      if (token.email) {
        try {
          // Fetch user from MongoDB to get the latest state, especially subscription/usage
          await connectDB(); // Ensure DB connection
          // Note: We might need to store googleId in the token initially to easily find the user here
          // For now, let's try finding by email, assuming email is unique and in token
          const existingUser = await UserCollection.findOne<IUserDocument>({ email: token.email }); // Use UserCollection

          let userState;
          if (existingUser) {
             userState = await kv.get<UserProfile>(`user:${existingUser.email}`); // Fetch from KV using email from MongoDB
             // Update token with latest user state and MongoDB _id
             return { ...token, id: existingUser._id.toString(), ...(userState || {}) };
          } else if (token.id) {
             // Fallback: if user not found by email in DB, try using token.id (which might be googleId or MongoDB _id depending on initial sign-in logic)
             // This part might need refinement based on how you store user IDs
             // For now, if DB user not found by email, just return existing token
             console.warn('Server: User not found in DB by email in subsequent session JWT callback.', token.email);
             return token; // Return existing token if user not found
          } else {
             // If no email or id in token, return existing token
             console.warn('Server: No email or id in token in subsequent session JWT callback.', token);
             return token;
          }

        } catch (error) {
             console.error('Server: Error fetching userState or user in JWT callback (subsequent session):', error);
             return token; // Return existing token if KV/DB fetch fails
        }
      }

      console.log('Server: JWT Callback - Returning token unchanged:', token);
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      console.log('Server: Session Callback - Initial Session:', session);
      console.log('Server: Session Callback - Token:', token);

      // Add properties from token to session's user object
      if (token && session.user) { // Check if session.user exists
        session.user.id = token.id as string | undefined; // Assign token.id to session.user.id (this should be MongoDB _id)
        // Add other custom properties from the token with type assertions
        session.user.isSubscribed = token.isSubscribed as boolean | undefined;
        session.user.subscriptionExpiresAt = token.subscriptionExpiresAt as number | undefined;
        session.user.stripeCustomerId = token.stripeCustomerId as string | undefined;
        // Add any other fields you added to the token in the jwt callback

         console.log('Server: Session Callback - Updated Session User:', session.user);
      }

       console.log('Server: Session Callback - Returning Session:', session);
      return session;
    },
  },
  // 你可以在这里添加 pages 等配置
}; 