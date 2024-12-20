import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Use getToken to check for a valid session
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
    raw: true 
  });

  console.log("Middleware - Pathname:", pathname);
  console.log("Middleware - Token:", token ? "Present" : "Not Found");

  const isLoggedIn = Boolean(token);
  const isOnDashboard = pathname.startsWith("/dashboard");
  const isOnLogin = pathname === "/login";

  if (isOnDashboard && !isLoggedIn) {
    console.log("Middleware: Redirecting to login (no session for dashboard)");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isOnLogin && isLoggedIn) {
    console.log("Middleware: Redirecting to dashboard (already logged in)");
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Continue with the request if no redirects are necessary
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
