import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT, JWTEncodeParams, JWTDecodeParams } from "next-auth/jwt";
import type { Account, Profile } from "next-auth";
import Google from "next-auth/providers/google";

const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? '';
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
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    // Edge compatible JWT handling
    encode: async (params: JWTEncodeParams): Promise<string> => {
      console.log("JWT Encode - Token:", JSON.stringify(params.token, null, 2));
      return JSON.stringify(params.token);
    },
    decode: async (params: JWTDecodeParams): Promise<JWT | null> => {
      console.log("JWT Decode - Token:", params.token);
      if (!params.token) return null;
      return JSON.parse(params.token);
    }
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      console.log("Session Callback - Token:", JSON.stringify(token, null, 2));
      if (token) {
        session.user.id = token.sub as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
    async jwt({ 
      token, 
      user, 
      account, 
      profile 
    }: { 
      token: JWT; 
      user?: User; 
      account?: Account | null; 
      profile?: Profile | undefined;
    }): Promise<JWT> {
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
