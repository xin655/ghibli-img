import { AuthOptions, Session, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import connectDB from "@/app/lib/db";
import UserCollection, { IUserDocument } from "@/app/models/User";
import { HydratedDocument } from "mongoose";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user, account, profile }: { token: JWT; user?: User; account?: any; profile?: any }) {
      if (account && user) {
        try {
          await connectDB();
          let existingUser = await UserCollection.findOne<IUserDocument>({ googleId: user.id });

          if (existingUser) {
            existingUser.lastLoginAt = new Date();
            await existingUser.save();

            return { 
              ...token, 
              id: existingUser._id.toString(), 
              email: existingUser.email, 
              isSubscribed: existingUser.subscription?.status === 'active',
              subscriptionExpiresAt: existingUser.subscription?.endDate ? Math.floor(existingUser.subscription.endDate.getTime() / 1000) : undefined,
              stripeCustomerId: existingUser.subscription?.stripeCustomerId,
              lastLoginAt: Math.floor(existingUser.lastLoginAt.getTime() / 1000),
            };
          } else {
            const newUser = await UserCollection.create({
              email: user.email,
              name: user.name,
              photo: user.image,
              googleId: user.id,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLoginAt: new Date(),
            });

            return { ...token, id: newUser._id.toString(), email: newUser.email };
          }
        } catch (error) {
          console.error('Error in JWT callback during sign-in:', error);
          return { ...token, id: user.id, email: user.email };
        }
      }
      
      if (token.email && !token.lastLoginAt) {
        try {
          await connectDB();
          const existingUser = await UserCollection.findOne<IUserDocument>({ email: token.email });
          if (existingUser) {
            if(!existingUser.lastLoginAt) {
              existingUser.lastLoginAt = new Date();
              await existingUser.save();
            }
            return { 
              ...token, 
              id: existingUser._id.toString(), 
              email: existingUser.email, 
              isSubscribed: existingUser.subscription?.status === 'active',
              subscriptionExpiresAt: existingUser.subscription?.endDate ? Math.floor(existingUser.subscription.endDate.getTime() / 1000) : undefined,
              stripeCustomerId: existingUser.subscription?.stripeCustomerId,
              lastLoginAt: Math.floor(existingUser.lastLoginAt.getTime() / 1000),
            };
          } else {
            return token;
          }
        } catch(error) {
          console.error('Error in JWT callback during session check:', error);
          return token;
        }
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id as string | undefined;
        session.user.isSubscribed = token.isSubscribed as boolean | undefined;
        session.user.subscriptionExpiresAt = token.subscriptionExpiresAt as number | undefined;
        session.user.stripeCustomerId = token.stripeCustomerId as string | undefined;
        session.user.lastLoginAt = token.lastLoginAt as number | undefined;
      }
      return session;
    },
  },
}; 