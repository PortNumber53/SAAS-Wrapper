'use server'

import { xata } from "@/lib/xata"
import { auth } from "@/app/auth"
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

type Product = {
  id: string
  name: string
  description: string
  price: number
  inventory_count: number
  deleted_at?: string | null
  is_active?: boolean
  category_id?: string
  images?: any
  sku?: string
  meta?: {
    stripe_price_id?: string
    [key: string]: any
  }
}

// Product validation schema
const ProductSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long" }).max(100, { message: "Name cannot exceed 100 characters" }),
  description: z.string().optional(),
  price: z.number().min(0, { message: "Price must be a positive number" }).max(1000000, { message: "Price is too high" }),
  inventory_count: z.number().int().min(0, { message: "Inventory count must be a non-negative integer" }).max(10000, { message: "Inventory count is too high" }),
  stripe_price_id: z.string().optional()
})

// Validation function
function validateProductData(formData: FormData) {
  const validationResult = ProductSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    price: Number(formData.get('price')),
    inventory_count: Number(formData.get('inventory_count')),
    stripe_price_id: formData.get('stripe_price_id')?.toString() || undefined
  })

  if (!validationResult.success) {
    const errors = validationResult.error.errors.map(err => ({
      field: err.path[0],
      message: err.message
    }))

    throw new Error(JSON.stringify(errors))
  }

  return validationResult.data
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

    // Convert Xata records to plain objects
    const plainProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      inventory_count: product.inventory_count,
      is_active: product.is_active,
      category_id: product.category_id,
      deleted_at: product.deleted_at,
      images: product.images,
      sku: product.sku,
      meta: product.meta || {}
    }))

    return plainProducts as Product[]
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
    // Validate input first
    const validatedData = validateProductData(formData)
    const { stripe_price_id, ...productData } = validatedData

    // Prepare meta data
    const meta = stripe_price_id ? { stripe_price_id } : {}

    const product = await xata.db.products.create({
      ...productData,
      meta
    })

    // Convert Xata record to plain object
    const plainProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      inventory_count: product.inventory_count,
      is_active: product.is_active,
      category_id: product.category_id,
      deleted_at: product.deleted_at,
      images: product.images,
      sku: product.sku,
      meta: product.meta || {}
    }

    revalidatePath('/account/ecommerce/products')
    return plainProduct
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
  if (!id) {
    throw new Error('Product ID is required')
  }

  try {
    // Get existing product first
    const existingProduct = await xata.db.products.read(id)
    if (!existingProduct) {
      throw new Error('Product not found')
    }

    // Validate input
    const validatedData = validateProductData(formData)
    const { stripe_price_id, ...productData } = validatedData

    // Prepare meta data - preserve existing meta fields
    const existingMeta = existingProduct.meta || {}
    const meta = {
      ...existingMeta,
      stripe_price_id: stripe_price_id || null
    }

    const updatedProduct = await xata.db.products.update(id, {
      ...productData,
      meta
    })

    if (!updatedProduct) {
      throw new Error('Failed to update product')
    }

    // Convert Xata record to plain object
    const plainProduct = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      price: updatedProduct.price,
      inventory_count: updatedProduct.inventory_count,
      is_active: updatedProduct.is_active,
      category_id: updatedProduct.category_id,
      deleted_at: updatedProduct.deleted_at,
      images: updatedProduct.images,
      sku: updatedProduct.sku,
      meta: updatedProduct.meta || {}
    }

    revalidatePath('/account/ecommerce/products')
    return plainProduct
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

    // Convert Xata record to plain object
    const plainProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      inventory_count: product.inventory_count,
      is_active: product.is_active,
      category_id: product.category_id,
      deleted_at: product.deleted_at,
      images: product.images,
      sku: product.sku,
      meta: product.meta || {},
      stripe_price_id: product.meta?.stripe_price_id
    }

    revalidatePath('/account/ecommerce/products')
    return plainProduct
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}

export async function getStripeIntegrationStatus() {
  const session = await auth()

  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    const stripeIntegration = await xata.db.integrations
      .filter({ slug: 'stripe' })
      .getFirst()

    return {
      isEnabled: !!(stripeIntegration?.settings?.publishableKey && stripeIntegration?.settings?.secretKey)
    }
  } catch (error) {
    console.error('Error checking Stripe integration status:', error)
    return { isEnabled: false }
  }
}
