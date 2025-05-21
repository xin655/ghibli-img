import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { kv } from "@vercel/kv";
import { UserProfile } from "@/app/profile/page"; // Assuming UserProfile matches KV structure

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // 你可以在这里添加更多 provider
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      console.log('JWT Callback - Initial Token:', token);
      console.log('JWT Callback - User:', user);
      console.log('JWT Callback - Account:', account);

      // Add user data to the token on initial sign-in
      if (account && user) {
        try {
          const userState = await kv.get<UserProfile>(`user:${user.email}`); // Assert type
          console.log('JWT Callback - UserState from KV (initial sign-in):', userState);
          // Spread userState only if it's a valid object
          return { ...token, id: user.id, ...(userState || {}) }; // Use user.id for token.id
        } catch (error) {
            console.error('Error fetching userState in JWT callback (initial sign-in):', error);
             return { ...token, id: user.id }; // Return token with user id even if KV fetch fails
        }
      }

      // Subsequent sessions, fetch latest user state to keep token updated
      if (token.email) {
        try {
          const userState = await kv.get<UserProfile>(`user:${token.email}`); // Assert type
           console.log('JWT Callback - UserState from KV (subsequent session):', userState);
          // Spread userState only if it's a valid object
          return { ...token, ...(userState || {}) }; // Spread userState onto the token
        } catch (error) {
             console.error('Error fetching userState in JWT callback (subsequent session):', error);
             return token; // Return existing token if KV fetch fails
        }
      }

      console.log('JWT Callback - Returning token unchanged:', token);
      return token;
    },

    async session({ session, token }) {
      console.log('Session Callback - Initial Session:', session);
      console.log('Session Callback - Token:', token);

      // Add properties from token to session's user object
      if (token && session.user) { // Check if session.user exists
        session.user.id = token.id as string | undefined; // Assign token.id to session.user.id
        // Add other custom properties from the token with type assertions
        session.user.isSubscribed = token.isSubscribed as boolean | undefined;
        session.user.subscriptionExpiresAt = token.subscriptionExpiresAt as number | undefined;
        session.user.stripeCustomerId = token.stripeCustomerId as string | undefined;
        // Add any other fields you added to the token in the jwt callback

         console.log('Session Callback - Updated Session User:', session.user);
      }

       console.log('Session Callback - Returning Session:', session);
      return session;
    },
  },
  // 你可以在这里添加 pages 等配置
});

export { handler as GET, handler as POST }; 