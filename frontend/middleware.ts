import { auth } from "@/app/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { xata } from "@/lib/xata";
import { handleServerLogout } from "@/lib/auth-utils";
import { isRouteAccessible } from "@/lib/profile-utils";

const publicPaths = [
  "/login",
  "/api/auth",
  "/",
  "/features",
  "/docs",
  "/pricing",
  "/about",
  "/contact",
  "/ecommerce/browse",
  "/ecommerce/products",
  "/ecommerce/categories",
];

// Protected routes that require authentication
const protectedPaths = [
  "/account",
  "/dashboard",
  "/settings",
  "/billing",
  "/ecommerce/admin",
  "/ecommerce/manage",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("[Middleware] Processing request", {
    pathname,
    timestamp: new Date().toISOString(),
  });

  // Allow public paths
  if (
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith("/api/auth")
    )
  ) {
    console.log("[Middleware] Public path, allowing access", { pathname });
    return NextResponse.next();
  }

  // Check if the path requires authentication
  const requiresAuth = protectedPaths.some((path) => pathname.startsWith(path));
  if (!requiresAuth) {
    return NextResponse.next();
  }

  const session = await auth();

  console.log("[Middleware] Auth check result", {
    pathname,
    hasSession: !!session,
    userId: session?.user?.id,
    timestamp: new Date().toISOString(),
  });

  // If there's no session and we're not on a public path, redirect to login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);

    console.log("[Middleware] No session, redirecting to login", {
      from: pathname,
      to: loginUrl.toString(),
    });

    return NextResponse.redirect(loginUrl);
  }

  try {
    // Check if the user exists in the database
    const user = await xata.db.nextauth_users.read(session.user.id as string);
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
