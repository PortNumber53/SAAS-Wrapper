import NextAuth from "next-auth";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { getXataClient } from "@/lib/xata";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const xata = getXataClient();

export const authOptions: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
    // signOut: '/auth/signout',
    // error: '/auth/error',
    // verifyRequest: '/auth/verify-request',
    // newUser: '/auth/new-user'
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log("Signing in user:", user);
        // Check if user exists
        const existingUser = await xata.db.nextauth_users
          .filter({
            email: user.email,
          })
          .getFirst();

        if (!existingUser) {
          console.log("Creating new user");
          // Create new user in Xata
          await xata.db.nextauth_users.create({
            email: user.email,
            name: user.name,
            image: user.image,
            emailVerified: new Date().toISOString(),
            profile: "user", // This is required based on your schema
          });
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session?.user) {
        // Get user from Xata to ensure we have the latest data
        const xataUser = await xata.db.nextauth_users
          .filter({
            email: session.user.email,
          })
          .getFirst();
        if (xataUser) {
          session.user.id = xataUser.id;
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        const xataUser = await xata.db.nextauth_users
          .filter({
            email: user.email,
          })
          .getFirst();
        if (xataUser) {
          token.sub = xataUser.id;
        }
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      console.log("New user created:", user);
    },
  },
};

// Create and export Next-Auth handlers and auth function
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authOptions);
