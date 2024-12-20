import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { encode, decode } from 'jose';

const authOptions = {
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
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    // Explicitly handle token encoding and decoding
    encode: async ({ token, secret }) => {
      console.log("Custom JWT Encode - Token:", JSON.stringify(token, null, 2));

      // Convert token to a simple string representation
      const tokenString = JSON.stringify(token);
      
      return tokenString;
    },
    decode: async ({ token, secret }) => {
      console.log("Custom JWT Decode - Token:", token);
      
      try {
        // Attempt to parse the token string back to an object
        const parsedToken = JSON.parse(token || '{}');
        console.log("Parsed Token:", JSON.stringify(parsedToken, null, 2));
        return parsedToken;
      } catch (error) {
        console.error("JWT Decode Error:", error);
        return {};
      }
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
