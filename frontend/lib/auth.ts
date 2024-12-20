import { getServerSession } from "next-auth/next";
import NextAuth from "next-auth";
import { authConfig } from "@/app/auth.config";
import { cookies } from "next/headers";
import { jwtVerify } from 'jose';

const authHandler = NextAuth(authConfig);

export async function auth() {
  try {
    console.log("Attempting to retrieve server session");
    
    // Log session-related cookies for debugging
    const sessionCookies = [
      'next-auth.session-token', 
      'next-auth.csrf-token', 
      'next-auth.callback-url'
    ];
    
    // Use await with cookies()
    const cookieStore = await cookies();
    
    sessionCookies.forEach(cookieName => {
      const cookie = cookieStore.get(cookieName);
      console.log(`${cookieName} cookie:`, cookie ? cookie.value : 'Not found');
    });
    
    // Additional logging for session token
    const sessionTokenCookie = cookieStore.get('next-auth.session-token');
    if (sessionTokenCookie) {
      console.log("Session Token Cookie Length:", sessionTokenCookie.value.length);
      console.log("Session Token Cookie First 50 chars:", sessionTokenCookie.value.substring(0, 50));
      
      try {
        // Manually verify the JWE token
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
        const { payload } = await jwtVerify(sessionTokenCookie.value, secret);
        console.log("Manually Verified Token Payload:", JSON.stringify(payload, null, 2));
      } catch (verifyError) {
        console.error("Manual Verify Error:", verifyError);
      }
    }
    
    const session = await getServerSession(authConfig);
    console.log("Session retrieved:", session ? "Success" : "No session");
    
    // If session exists, log some details without accessing undefined properties
    if (session) {
      console.log("Session user details:", {
        hasUser: !!session.user,
        email: session.user?.email,
        name: session.user?.name
      });
    } else {
      console.log("No active session found");
    }
    
    return session;
  } catch (error) {
    console.error("Detailed session retrieval error:", {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    
    // Log additional context about the error
    if (error instanceof Error) {
      if (error.name === 'JWEDecryptionFailed') {
        console.error("JWT Decryption Failed: This might indicate an issue with the session token.");
        console.error("Possible causes:");
        console.error("1. NEXTAUTH_SECRET might be incorrect or changed");
        console.error("2. Session token might be corrupted");
        console.error("3. Browser cookies might need to be cleared");
      }
    }
    
    return null;
  }
}

export const signIn = async () => {
  throw new Error("signIn method not implemented on the server");
};

export const signOut = async () => {
  throw new Error("signOut method not implemented on the server");
};

// Fallback handlers
export const GET = () => {};
export const POST = () => {};
