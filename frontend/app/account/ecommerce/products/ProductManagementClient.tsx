"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  TrashIcon
} from "lucide-react"
import useToast from "@/components/ui/use-toast"

// Server Actions
import { createProduct, updateProduct, deleteProduct } from './actions'

type Product = {
  id: string
  name: string
  description: string
  price: number
  inventory_count: number
}

export default function ProductManagementClient({
  initialProducts
}: {
  initialProducts: Product[]
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [filteredProducts, setFilteredProducts] = useState(products)
  const { toast } = useToast()

  // State for form
  const [isEditing, setIsEditing] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [inventoryCount, setInventoryCount] = useState('')

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    const searchTerm = (e.target as HTMLFormElement).search.value.toLowerCase()
    const filtered = products.filter(
      product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    )
    setFilteredProducts(filtered)
  }

  const handleEditClick = (product: Product) => {
    setCurrentProduct(product)
    setName(product.name)
    setDescription(product.description || '')
    setPrice(product.price.toString())
    setInventoryCount(product.inventory_count.toString())
    setIsEditing(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()
    formData.append('name', name)
    formData.append('description', description)
    formData.append('price', price)
    formData.append('inventory_count', inventoryCount)

    try {
      let result: Product
      if (isEditing && currentProduct) {
        formData.append('id', currentProduct.id)
        result = await updateProduct(formData)
        setProducts(products.map(p => p.id === currentProduct.id ? result : p))
        setFilteredProducts(filteredProducts.map(p => p.id === currentProduct.id ? result : p))
      } else {
        result = await createProduct(formData)
        setProducts([...products, result])
        setFilteredProducts([...filteredProducts, result])
      }

      // Reset form
      setName('')
      setDescription('')
      setPrice('')
      setInventoryCount('')
      setIsEditing(false)
      setCurrentProduct(null)
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
          setCurrentProduct(null)
          setName('')
          setDescription('')
          setPrice('')
          setInventoryCount('')
        }}>
          Add Product
        </Button>
      </div>

      {/* Product Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4 p-4 bg-gray-100 rounded-lg">
        <div className="col-span-4 grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="col-span-3"
            required
          />
        </div>
        <div className="col-span-4 grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="col-span-4 grid grid-cols-4 items-center gap-4">
          <Label htmlFor="price" className="text-right">Price</Label>
          <Input
            id="price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="col-span-3"
            required
            step="0.01"
            min="0"
          />
        </div>
        <div className="col-span-4 grid grid-cols-4 items-center gap-4">
          <Label htmlFor="inventory_count" className="text-right">Inventory Count</Label>
          <Input
            id="inventory_count"
            type="number"
            value={inventoryCount}
            onChange={(e) => setInventoryCount(e.target.value)}
            className="col-span-3"
            required
            min="0"
          />
        </div>
        <div className="col-span-4 flex justify-end space-x-2">
          <Button type="submit" variant="default">
            {isEditing ? 'Update Product' : 'Create Product'}
          </Button>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setCurrentProduct(null)
                setName('')
                setDescription('')
                setPrice('')
                setInventoryCount('')
              }}
            >
              Cancel
            </Button>
          )}
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
