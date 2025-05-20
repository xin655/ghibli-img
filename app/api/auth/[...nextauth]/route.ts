import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { kv } from "@vercel/kv";

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
      if (account && user) {
        const userState = await kv.get(`user:${user.email}`);
        return { ...token, userId: user.id, ...(userState as any || {}) };
      }
      if (token.email) {
        const userState = await kv.get(`user:${token.email}`);
        return { ...token, ...(userState as any || {}) };
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string | undefined;
        session.user.isSubscribed = token.isSubscribed as boolean | undefined;
        session.user.subscriptionExpiresAt = token.subscriptionExpiresAt as number | undefined;
        session.user.stripeCustomerId = token.stripeCustomerId as string | undefined;
      }
      return session;
    },
  },
  // 你可以在这里添加 pages 等配置
});

export { handler as GET, handler as POST }; 