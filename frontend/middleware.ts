import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { xata } from "@/lib/xata";
import { handleServerLogout } from "@/lib/auth-utils";
import { isRouteAccessible } from "@/lib/profile-utils";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // If no token, redirect to login for protected routes
  if (!token) {
    if (
      pathname.startsWith("/account") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/e/")
    ) {
      return Response.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  try {
    // Check if the user exists in the database
    const user = await xata.db.nextauth_users.read(token.sub as string);
    if (!user) {
      return handleServerLogout(request, "USER_NOT_FOUND");
    }

    // Check profile-based access
    if (!isRouteAccessible(pathname, user.profile)) {
      return Response.redirect(new URL("/", request.url));
    }

    // Continue with the request if all checks pass
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware authentication error:", error);
    return handleServerLogout(request, "VERIFICATION_FAILED");
  }
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Protected routes
    "/account/:path*",
    "/admin/:path*",
    "/e/:path*",
    "/dashboard/:path*",
    "/billing/:path*",
    "/settings/:path*",
  ],
};
