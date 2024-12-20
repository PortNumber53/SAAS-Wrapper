import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? '';
const nextAuthUrl = process.env.NEXTAUTH_URL ?? '';
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
console.log('>>>>>>>>>NEXTAUTH_SECRET:', nextAuthSecret ? `PRESENT:${nextAuthSecret}` : 'MISSING')

export const authConfig = {
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: nextAuthSecret,
  url: nextAuthUrl,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    // Disable encryption for debugging
    encode: async ({ token }) => {
      console.log("JWT Encode - Token:", JSON.stringify(token, null, 2));
      return JSON.stringify(token);
    },
    decode: async ({ token }) => {
      console.log("JWT Decode - Token:", token);
      return JSON.parse(token || '{}');
    }
  },
  callbacks: {
    async session({ session, token }) {
      console.log("Session Callback - Token:", JSON.stringify(token, null, 2));
      if (token) {
        session.user.id = token.sub;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      console.log("JWT Callback - Inputs:", {
        token: JSON.stringify(token, null, 2),
        user: JSON.stringify(user, null, 2),
        account: JSON.stringify(account, null, 2),
        profile: JSON.stringify(profile, null, 2)
      });

      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }

      return token;
    }
  },
  debug: true
} satisfies NextAuthOptions;
