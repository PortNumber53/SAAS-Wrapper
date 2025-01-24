import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { XataAdapter } from "@auth/xata-adapter";
import { getXataClient } from "@/lib/xata";
import type { User, Account, Profile, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Adapter } from "next-auth/adapters";

const xata = getXataClient();

export const authOptions: NextAuthConfig = {
  adapter: XataAdapter(xata) as Adapter,
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
    async signIn({
      user,
      account,
      profile,
    }: {
      user: User;
      account: Account | null;
      profile?: Profile;
    }) {
      console.log("[Auth] SignIn callback", {
        user: { id: user.id, email: user.email },
        account: { provider: account?.provider, type: account?.type },
        timestamp: new Date().toISOString(),
      });
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
    async session({ session, user }: { session: Session; user: User }) {
      console.log("[Auth] Session callback", {
        user: { id: user.id, email: user.email },
        sessionUser: session.user,
        timestamp: new Date().toISOString(),
      });

      if (session.user && user.id) {
        session.user.id = user.id;
      }
      return session;
    },
    async jwt({
      token,
      user,
      account,
    }: {
      token: JWT;
      user?: User;
      account?: Account | null;
    }) {
      console.log("[Auth] JWT callback", {
        tokenSub: token.sub,
        userId: user?.id,
        accountProvider: account?.provider,
        timestamp: new Date().toISOString(),
      });

      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      console.log("New user created:", user);
    },
  },
  debug: true, // Enable debug logs in production temporarily
};

const { auth, handlers, signIn, signOut } = NextAuth(authOptions);

export { auth, signIn, signOut };
export const { GET, POST } = handlers;
