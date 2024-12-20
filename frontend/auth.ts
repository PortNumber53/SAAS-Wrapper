import NextAuth from "next-auth";
import type { Session, User, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { AuthOptions, SessionStrategy } from "next-auth";
import Google from "next-auth/providers/google";

const authOptions: AuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      console.log("Session Callback - Token:", JSON.stringify(token, null, 2));
      if (token) {
        session.user.id = token.sub ?? '';
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;
      }
      return session;
    },
    async jwt({ token, user, account, profile }: {
      token: JWT;
      user?: User;
      account?: Account | null;
      profile?: Profile
    }) {
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
};

export const {
  handlers = { GET: () => {}, POST: () => {} },
  auth,
  signIn,
  signOut
} = NextAuth(authOptions);

// Fallback handlers if destructuring fails
export const GET = handlers.GET;
export const POST = handlers.POST;
