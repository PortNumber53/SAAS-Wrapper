"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  EditIcon,
  TrashIcon,
  AlertTriangleIcon,
  Loader2Icon
} from "lucide-react"
import useToast from "@/components/ui/use-toast"
import { getStoredIntegrationStatus } from '@/lib/integration-utils'
import Link from 'next/link'

// Server Actions
import { createProduct, updateProduct, deleteProduct } from './actions'

type Product = {
  id: string
  name: string
  description: string
  price: number
  inventory_count: number
  meta?: {
    stripe_price_id?: string
    [key: string]: any
  }
}

export default function ProductManagementClient({
  products: initialProducts = []
}: {
  products: Product[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts || [])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(initialProducts || [])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Get Stripe integration status from localStorage
  const [isStripeEnabled] = useState(() => {
    try {
      return getStoredIntegrationStatus().stripe || false
    } catch {
      return false
    }
  })

  // Update filtered products when products change
  useEffect(() => {
    setFilteredProducts(products || [])
  }, [products])

  // State for form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [inventoryCount, setInventoryCount] = useState('')
  const [stripePriceId, setStripePriceId] = useState('')

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    const searchTerm = (e.target as HTMLFormElement).search.value.toLowerCase()
    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm) ||
      (product.description || '').toLowerCase().includes(searchTerm)
    )
    setFilteredProducts(filtered)
  }

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product)
    setName(product.name)
    setDescription(product.description || '')
    setPrice(product.price.toString())
    setInventoryCount(product.inventory_count.toString())
    setStripePriceId(product.meta?.stripe_price_id || '')
    setIsEditing(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()
    formData.append('name', name)
    formData.append('description', description)
    formData.append('price', price)
    formData.append('inventory_count', inventoryCount)
    if (isStripeEnabled) {
      // Always send stripe_price_id when Stripe is enabled, even if empty
      formData.append('stripe_price_id', stripePriceId)
    }
    if (isEditing && selectedProduct) {
      formData.append('id', selectedProduct.id)
    }

    try {
      let result: Product
      if (isEditing && selectedProduct) {
        result = await updateProduct(formData)
      } else {
        result = await createProduct(formData)
      }

      // Update both products and filteredProducts with the new data
      if (isEditing) {
        setProducts(products.map(p => p.id === result.id ? result : p))
        setFilteredProducts(filteredProducts.map(p => p.id === result.id ? result : p))
      } else {
        setProducts([...products, result])
        setFilteredProducts([...filteredProducts, result])
      }

      // Reset form
      setName('')
      setDescription('')
      setPrice('')
      setInventoryCount('')
      setStripePriceId('')
      setIsEditing(false)
      setSelectedProduct(null)

      toast({
        title: isEditing ? "Product Updated" : "Product Created",
        description: `Successfully ${isEditing ? 'updated' : 'created'} product ${result.name}`,
      })
    } catch (error) {
      if (error instanceof Error) {
        try {
          const validationErrors = JSON.parse(error.message)
          const errorMessages = validationErrors.map((err: any) =>
            `${err.field}: ${err.message}`
          ).join('\n')

          toast({
            title: "Validation Error",
            description: errorMessages,
            variant: "destructive"
          })
        } catch {
          toast({
            title: "Error",
            description: "An unexpected error occurred",
            variant: "destructive"
          })
        }
      }
    }
  }

  const handleDeleteClick = async (productId: string) => {
    const formData = new FormData()
    formData.append('id', productId)

    try {
      await deleteProduct(formData)
      const updatedProducts = products.filter(p => p.id !== productId)
      setProducts(updatedProducts)
      setFilteredProducts(updatedProducts)
    } catch (error) {
      console.error('Failed to delete product:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Products</h1>
        <Button onClick={() => {
          setIsEditing(false)
          setSelectedProduct(null)
          setName('')
          setDescription('')
          setPrice('')
          setInventoryCount('')
          setStripePriceId('')
        }}>
          Add Product
        </Button>
      </div>

      {/* Product Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4 p-4 bg-gray-100 rounded-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inventory_count">Inventory Count</Label>
            <Input
              id="inventory_count"
              type="number"
              value={inventoryCount}
              onChange={(e) => setInventoryCount(e.target.value)}
              placeholder="0"
            />
          </div>

          {isStripeEnabled ? (
            <div className="space-y-2">
              <Label htmlFor="stripe_price_id">
                Stripe Price ID
                <span className="ml-1 text-sm text-muted-foreground">
                  (e.g., price_H5ggYwtDq4fbrJ)
                </span>
              </Label>
              <Input
                id="stripe_price_id"
                value={stripePriceId}
                onChange={(e) => setStripePriceId(e.target.value)}
                placeholder="price_..."
              />
            </div>
          ) : (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Stripe Integration Disabled</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Enable Stripe integration in your{' '}
                      <Link href="/account/integrations" className="font-medium underline hover:text-yellow-800">
                        integration settings
                      </Link>{' '}
                      to accept payments for this product.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setSelectedProduct(null)
                setName('')
                setDescription('')
                setPrice('')
                setInventoryCount('')
                setStripePriceId('')
                setIsDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isLoading ||
                !name ||
                !price ||
                !inventoryCount
              }
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditing ? 'Update Product' : 'Create Product'}</>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Product List */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Inventory Count</TableHead>
            {isStripeEnabled && <TableHead>Stripe Price ID</TableHead>}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.description}</TableCell>
              <TableCell>${product.price.toFixed(2)}</TableCell>
              <TableCell>{product.inventory_count}</TableCell>
              {isStripeEnabled && <TableCell>{product.meta?.stripe_price_id || '-'}</TableCell>}
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(product)}
                  >
                    <EditIcon className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(product.id)}
                  >
                    <TrashIcon className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
