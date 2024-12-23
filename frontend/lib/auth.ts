import { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { XataAdapter } from "@auth/xata-adapter";
import { xata } from "@/lib/xata";
import NextAuth from "next-auth";
import { cookies } from 'next/headers';
import { getToken } from "next-auth/jwt";

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
      console.log('Session callback - token:', JSON.stringify(token, null, 2));
      console.log('Session callback - session:', JSON.stringify(session, null, 2));
      
      if (session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, account, profile }: any) {
      console.log('JWT callback - token:', JSON.stringify(token, null, 2));
      console.log('JWT callback - user:', JSON.stringify(user, null, 2));
      console.log('JWT callback - account:', JSON.stringify(account, null, 2));
      console.log('JWT callback - profile:', JSON.stringify(profile, null, 2));
      
      if (user) {
        token.id = user.id;
      }
      return token;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login'
  },
  debug: true // Enable debug logging
};

export const { auth, signIn, signOut } = NextAuth(authOptions);

export async function getSession() {
  try {
    const cookieStore = cookies();
    const sessionTokenCookie = cookieStore.get('authjs.session-token');
    
    console.log('Session Token Cookie:', sessionTokenCookie);

    if (!sessionTokenCookie) {
      console.log('No session token cookie found');
      return null;
    }

    // Decode the session token manually
    const sessionToken = sessionTokenCookie.value;
    
    // You might need to implement a custom token verification method
    // This is a simplified example and might need adjustment based on your exact setup
    const decodedToken = {
      sub: sessionToken.split('|')[0], // Adjust this based on your token structure
      email: 'user@example.com', // Placeholder - you'll need to extract this from the token
      name: 'User' // Placeholder
    };

    console.log('Decoded Token:', JSON.stringify(decodedToken, null, 2));

    return decodedToken ? { 
      user: { 
        id: decodedToken.sub, 
        email: decodedToken.email, 
        name: decodedToken.name 
      } 
    } : null;
  } catch (error) {
    console.error('Error in getSession:', error);
    return null;
  }
}
