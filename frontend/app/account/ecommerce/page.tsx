import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ShoppingCartIcon, PackageIcon, ReceiptIcon } from "lucide-react"

export const runtime = 'edge';

export default async function EcommercePage() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <ShoppingCartIcon className="mr-3 w-8 h-8" />
        E-commerce Dashboard
      </h1>
      
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
            Add, edit, or remove products
          </p>
          <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors">
            Manage Products
          </button>
        </div>

        {/* Cart Section */}
        <div className="bg-white dark:bg-black border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center">
              <ShoppingCartIcon className="mr-2 w-5 h-5" />
              Shopping Cart
            </h2>
            <span className="text-muted-foreground">Current</span>
          </div>
          <p className="text-sm text-muted-foreground">
            View and manage your current cart
          </p>
          <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors">
            View Cart
          </button>
        </div>
      </div>
    </div>
  )
}
