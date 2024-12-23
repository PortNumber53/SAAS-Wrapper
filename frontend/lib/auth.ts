import { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { XataAdapter } from "@auth/xata-adapter";
import { xata } from "@/lib/xata";

export const authOptions: NextAuthConfig = {
  adapter: XataAdapter(xata) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    }
  },
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: '/login'
  }
};
