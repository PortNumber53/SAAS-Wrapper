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
  attributes?: any
}

// Product validation schema
const ProductSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long" }).max(100, { message: "Name cannot exceed 100 characters" }),
  description: z.string().optional(),
  price: z.number().min(0, { message: "Price must be a positive number" }).max(1000000, { message: "Price is too high" }),
  inventory_count: z.number().int().min(0, { message: "Inventory count must be a non-negative integer" }).max(10000, { message: "Inventory count is too high" }),
})

// Validation function
function validateProductData(data: FormData) {
  const validationResult = ProductSchema.safeParse({
    name: data.get('name'),
    description: data.get('description'),
    price: Number(data.get('price')),
    inventory_count: Number(data.get('inventory_count')),
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
      attributes: product.attributes
    }))

    console.log('Fetched products:', plainProducts)
    console.log('Current user ID:', session?.user?.id)

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

    const product = await xata.db.products.create(validatedData)

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
      attributes: product.attributes
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

  try {
    // Validate input first
    const validatedData = validateProductData(formData)

    const updatedProduct = await xata.db.products.update(id, validatedData)

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
      attributes: updatedProduct.attributes
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
      attributes: product.attributes
    }

    revalidatePath('/account/ecommerce/products')
    return plainProduct
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}
