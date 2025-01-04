"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  PlusIcon,
  EditIcon,
  TrashIcon
} from "lucide-react"

// Server Actions
import { createProduct, updateProduct, deleteProduct } from './actions'

type Product = {
  id: string
  name: string
  description: string
  price: number
  inventory: number
}

export default function ProductManagementClient({ 
  initialProducts 
}: { 
  initialProducts: Product[] 
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)

  // Add Product Dialog Component
  function AddProductDialog() {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState('')
    const [inventory, setInventory] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('price', price)
      formData.append('inventory', inventory)

      try {
        const newProduct = await createProduct(formData)
        if (newProduct) {
          setProducts([...products, newProduct])
          // Reset form
          setName('')
          setDescription('')
          setPrice('')
          setInventory('')
        }
      } catch (err) {
        console.error('Failed to create product:', err)
      }
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center">
            <PlusIcon className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input 
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea 
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required 
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input 
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required 
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="inventory">Inventory</Label>
              <Input 
                id="inventory"
                type="number"
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
                required 
                min="0"
              />
            </div>
            <Button type="submit" className="w-full">Create Product</Button>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  // Edit Product Dialog Component
  function EditProductDialog({ product }: { product: Product }) {
    const [name, setName] = useState(product.name)
    const [description, setDescription] = useState(product.description)
    const [price, setPrice] = useState(product.price.toString())
    const [inventory, setInventory] = useState(product.inventory.toString())

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      const formData = new FormData()
      formData.append('id', product.id)
      formData.append('name', name)
      formData.append('description', description)
      formData.append('price', price)
      formData.append('inventory', inventory)

      try {
        const updatedProduct = await updateProduct(formData)
        if (updatedProduct) {
          setProducts(products.map(p => 
            p.id === product.id ? updatedProduct : p
          ))
        }
      } catch (err) {
        console.error('Failed to update product:', err)
      }
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <EditIcon className="h-4 w-4 mr-2" /> Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input 
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea 
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required 
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input 
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required 
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="inventory">Inventory</Label>
              <Input 
                id="inventory"
                type="number"
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
                required 
                min="0"
              />
            </div>
            <Button type="submit" className="w-full">Update Product</Button>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  // Handle product deletion
  const handleDeleteProduct = async (productId: string) => {
    const formData = new FormData()
    formData.append('id', productId)

    try {
      await deleteProduct(formData)
      setProducts(products.filter(p => p.id !== productId))
    } catch (err) {
      console.error('Failed to delete product:', err)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Products</h1>
        <AddProductDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Inventory</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.description}</TableCell>
              <TableCell>${product.price?.toFixed(2) || 'N/A'}</TableCell>
              <TableCell>{product.inventory}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <EditProductDialog product={product} />
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" /> Delete
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
