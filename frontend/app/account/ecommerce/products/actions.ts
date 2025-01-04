'use server'

import { xata } from "@/lib/xata"
import { auth } from "@/app/auth"
import { revalidatePath } from 'next/cache'

type Product = {
  id: string
  name: string
  description: string
  price: number
  inventory: number
}

export async function getProducts() {
  const session = await auth()
  
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    const products = await xata.db.products
      .filter({ user: session.user.id })
      .getMany()

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
      inventory: Number(formData.get('inventory')),
      user: session.user.id
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
      inventory: Number(formData.get('inventory'))
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

  const id = formData.get('id') as string

  try {
    await xata.db.products.delete(id)

    revalidatePath('/account/ecommerce/products')
    return { success: true }
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}
