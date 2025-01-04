"use client"

export const runtime = 'edge';

import { signOut } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LogoutPage() {
  const searchParams = useSearchParams()
  const error = searchParams?.get('error') || null

  useEffect(() => {
    // Force sign out
    signOut({
      redirect: true,
      redirectTo: '/login'
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8 rounded-lg shadow-md">
        {error === 'invalid_session' && (
          <div className="text-destructive">
            <h2 className="text-2xl font-bold mb-4">Session Expired</h2>
            <p>Your user account no longer exists. Please log in again.</p>
          </div>
        )}

        {error === 'session_verification_failed' && (
          <div className="text-destructive">
            <h2 className="text-2xl font-bold mb-4">Authentication Error</h2>
            <p>We couldn't verify your account. Please log in again.</p>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <Link href="/login">
            <Button variant="default">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
