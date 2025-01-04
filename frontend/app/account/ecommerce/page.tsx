"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ShoppingCartIcon, PackageIcon, ReceiptIcon } from "lucide-react"
import { signOut } from "@/app/auth"

export const runtime = 'edge';

export default function EcommercePage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    console.log('Ecommerce Page Session Status:', status)
    console.log('Ecommerce Page Session Data:', session)

    if (status === 'unauthenticated') {
      console.log('No session found, redirecting to login')
      router.push('/login')
    }
  }, [status, session, router])

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/login' })
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <ShoppingCartIcon className="mr-3 w-8 h-8" />
          E-commerce Dashboard
        </h1>
        <button 
          onClick={handleSignOut}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Orders Section */}
        <div className="bg-white dark:bg-black border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center">
              <ReceiptIcon className="mr-2 w-5 h-5" />
              Orders
            </h2>
            <span className="text-muted-foreground">Recent</span>
          </div>
          <p className="text-sm text-muted-foreground">
            View and manage your recent orders
          </p>
          <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors">
            View Orders
          </button>
        </div>

        {/* Products Section */}
        <div className="bg-white dark:bg-black border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center">
              <PackageIcon className="mr-2 w-5 h-5" />
              Products
            </h2>
            <span className="text-muted-foreground">Manage</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Add, edit, and track your product inventory
          </p>
          <button 
            onClick={() => router.push('/account/ecommerce/products')}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Manage Products
          </button>
        </div>

        {/* Sales Section */}
        <div className="bg-white dark:bg-black border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center">
              <ShoppingCartIcon className="mr-2 w-5 h-5" />
              Sales
            </h2>
            <span className="text-muted-foreground">Overview</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Track your sales performance
          </p>
          <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors">
            View Sales
          </button>
        </div>
      </div>
    </div>
  )
}
