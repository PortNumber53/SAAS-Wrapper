import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { xata } from '@/lib/xata'
import { handleServerLogout, isSessionExpired, AUTH_ERROR_MESSAGES } from '@/lib/auth-utils'

export async function middleware(request: NextRequest) {
  // Get the token from the request
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // If no token, allow access to public routes
  if (!token) {
    return NextResponse.next()
  }

  try {
    // Check if the user exists in the database
    const user = await xata.db.nextauth_users.read(token.sub as string)
    if (!user) {
      return handleServerLogout(request, 'USER_NOT_FOUND')
    }

    // Check session expiry (if available in token)
    if (token.exp && isSessionExpired(new Date(token.exp * 1000))) {
      return handleServerLogout(request, 'INVALID_SESSION')
    }

    // Continue with the request if all checks pass
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware authentication error:', error)
    return handleServerLogout(request, 'VERIFICATION_FAILED')
  }
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Protected routes
    '/account/:path*',
    '/dashboard/:path*',
    '/billing/:path*',
    '/settings/:path*'
  ]
}
