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
  inventory_count: number
}

export default function ProductManagementClient({
  initialProducts
}: {
  initialProducts: Product[]
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [filteredProducts, setFilteredProducts] = useState(products)

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    const filterValue = (e.target as HTMLFormElement).elements.namedItem('filter')?.value
    if (filterValue) {
      setFilteredProducts(products.filter(product => product.name.toLowerCase().includes(filterValue.toLowerCase())))
    } else {
      setFilteredProducts(products)
    }
  }

  // Add Product Dialog Component
  function AddProductDialog() {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState('')
    const [inventory_count, setInventoryCount] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('price', price)
      formData.append('inventory_count', inventory_count)

      try {
        const newProduct = await createProduct(formData)
        setProducts([...products, newProduct])
        setFilteredProducts([...filteredProducts, newProduct])
        // Reset form
        setName('')
        setDescription('')
        setPrice('')
        setInventoryCount('')
      } catch (error) {
        console.error('Failed to create product:', error)
      }
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <PlusIcon className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="col-span-3"
                required
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="inventory_count" className="text-right">
                Inventory Count
              </Label>
              <Input
                id="inventory_count"
                type="number"
                value={inventory_count}
                onChange={(e) => setInventoryCount(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <Button type="submit">Save Product</Button>
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
    const [inventory_count, setInventoryCount] = useState(product.inventory_count.toString())

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      const formData = new FormData()
      formData.append('id', product.id)
      formData.append('name', name)
      formData.append('description', description)
      formData.append('price', price)
      formData.append('inventory_count', inventory_count)

      try {
        const updatedProduct = await updateProduct(formData)
        if (updatedProduct) {
          setProducts(products.map(p =>
            p.id === product.id ? updatedProduct : p
          ))
          setFilteredProducts(filteredProducts.map(p =>
            p.id === product.id ? updatedProduct : p
          ))
        }
      } catch (error) {
        console.error('Failed to update product:', error)
      }
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <EditIcon className="mr-2 h-4 w-4" /> Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="col-span-3"
                required
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="inventory_count" className="text-right">
                Inventory Count
              </Label>
              <Input
                id="inventory_count"
                type="number"
                value={inventory_count}
                onChange={(e) => setInventoryCount(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <Button type="submit">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  // Delete Product Dialog Component
  function DeleteProductDialog({ productId }: { productId: string }) {
    const handleDelete = async () => {
      const formData = new FormData()
      formData.append('id', productId)

      try {
        await deleteProduct(formData)
        setProducts(products.filter(p => p.id !== productId))
        setFilteredProducts(filteredProducts.filter(p => p.id !== productId))
      } catch (err) {
        console.error('Failed to delete product:', err)
      }
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <TrashIcon className="mr-2 h-4 w-4" /> Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this product?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Products</h1>
        <AddProductDialog />
        <form onSubmit={handleFilter} className="flex items-center">
          <Input
            id="filter"
            type="search"
            placeholder="Filter products"
            className="w-full p-2 border rounded"
          />
          <Button type="submit" className="ml-2">Filter</Button>
        </form>
      </div>

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
                  <EditProductDialog product={product} />
                  <DeleteProductDialog productId={product.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
