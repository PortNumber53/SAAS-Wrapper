'use server'

import { xata } from "@/lib/xata"
import { auth } from "@/app/auth"
import { revalidatePath } from 'next/cache'

type Product = {
  id: string
  name: string
  description: string
  price: number
  inventory_count: number
  deleted_at?: string | null
}

export async function getProducts() {
  const session = await auth()

  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    // Fetch products that are not soft-deleted
    const products = await xata.db.products.filter({
      deleted_at: null
    }).getMany()

    console.log('Fetched products:', products)
    console.log('Current user ID:', session.user.id)

    return products as Product[]
  } catch (error) {
    console.error('Error fetching products:', error)
    throw error
  }
}

export async function createProduct(formData: FormData) {
  const session = await auth()

  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    const product = await xata.db.products.create({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: Number(formData.get('price')),
      inventory_count: Number(formData.get('inventory_count')),
    })

    revalidatePath('/account/ecommerce/products')
    return product
  } catch (error) {
    console.error('Error creating product:', error)
    throw error
  }
}

export async function updateProduct(formData: FormData) {
  const session = await auth()

  if (!session) {
    throw new Error('Unauthorized')
  }

  const id = formData.get('id') as string

  try {
    const updatedProduct = await xata.db.products.update(id, {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: Number(formData.get('price')),
      inventory_count: Number(formData.get('inventory_count'))
    })

    revalidatePath('/account/ecommerce/products')
    return updatedProduct
  } catch (error) {
    console.error('Error updating product:', error)
    throw error
  }
}

export async function deleteProduct(formData: FormData) {
  const session = await auth()

  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    const productId = formData.get('id') as string

    const product = await xata.db.products.update(productId, {
      deleted_at: new Date().toISOString()
    })

    revalidatePath('/account/ecommerce/products')
    return product
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}
