import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { xata } from '@/lib/xata'

export async function middleware(request: NextRequest) {
  // Get the token from the request
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // If no token, continue (login/auth pages should be accessible)
  if (!token) {
    return NextResponse.next()
  }

  // Check if the user exists in the database
  try {
    const user = await xata.db.nextauth_users.read(token.sub as string)

    // If user doesn't exist, clear the session
    if (!user) {
      // Redirect to logout or login page
      const logoutUrl = new URL('/logout', request.url)
      
      // Optional: Add a query parameter to show an error message
      logoutUrl.searchParams.set('error', 'invalid_session')

      // Create a response to clear the session cookie
      const response = NextResponse.redirect(logoutUrl)
      response.cookies.delete('next-auth.session-token')

      return response
    }

    // Continue with the request if user exists
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware user check error:', error)
    
    // Fallback to logout in case of any error
    const logoutUrl = new URL('/logout', request.url)
    logoutUrl.searchParams.set('error', 'session_verification_failed')

    const response = NextResponse.redirect(logoutUrl)
    response.cookies.delete('next-auth.session-token')

    return response
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
