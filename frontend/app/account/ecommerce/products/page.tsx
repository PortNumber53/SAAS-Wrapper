import { auth } from "@/app/auth"
import { redirect } from "next/navigation"
import ProductManagementClient from "./ProductManagementClient"
import { getProducts } from "./actions"

export const runtime = 'edge'

export default async function ProductManagementPage() {
  const session = await auth()

  console.log('Server-side session check for Products page:', JSON.stringify(session, null, 2))

  if (!session) {
    console.log('No session found, redirecting to login')
    redirect('/login')
  }

  // Explicitly check for user and user ID
  if (!session.user || !session.user.id) {
    console.log('Invalid session: missing user or user ID')
    redirect('/login')
  }

  try {
    const initialProducts = await getProducts()
    return <ProductManagementClient initialProducts={initialProducts} />
  } catch (error) {
    console.error('Failed to fetch products:', error)
    redirect('/login')
  }
}