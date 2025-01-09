import { auth } from "@/app/auth"
import { redirect } from "next/navigation"
import ProductManagementClient from "./ProductManagementClient"
import { getProducts } from "./actions"

export const runtime = 'edge'

type Product = {
  id: string
  name: string
  description: string
  price: number
  inventory_count: number
}

export default async function ProductManagementPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  try {
    const products = await getProducts()
    
    if (!Array.isArray(products)) {
      console.error('Products is not an array:', products)
      return <ProductManagementClient products={[]} />
    }

    return <ProductManagementClient products={products} />
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return <ProductManagementClient products={[]} />
  }
}