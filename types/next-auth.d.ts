import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id?: string; // Add user ID
      isSubscribed?: boolean; // Add subscription status
      subscriptionExpiresAt?: number; // Add subscription expiry timestamp
      stripeCustomerId?: string; // Add Stripe Customer ID
      // Add other properties you need
    } & DefaultSession['user'];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User {
    id?: string; // Add user ID
    isSubscribed?: boolean; // Add subscription status
    subscriptionExpiresAt?: number; // Add subscription expiry timestamp
    stripeCustomerId?: string; // Add Stripe Customer ID
    // Add other properties you need
  }
}

declare module "next-auth/jwt" {
  /**
   * Returned by the `jwt` callback and `getToken`, when using JWT sessions
   */
  interface JWT {
    id?: string; // Add user ID
    isSubscribed?: boolean; // Add subscription status
    subscriptionExpiresAt?: number; // Add subscription expiry timestamp
    stripeCustomerId?: string; // Add Stripe Customer ID
    // Add other properties you need
  }
} 