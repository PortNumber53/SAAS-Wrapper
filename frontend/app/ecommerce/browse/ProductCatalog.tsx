'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from '@/lib/utils'

interface Product {
  id: string
  name: string
  description: string
  price: number
  inventory_count: number
}

export function ProductCatalog({ products }: { products: Product[] }) {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
        {products.map((product) => (
          <Card key={product.id} className="group relative">
            <CardContent className="p-0">
              {/* Placeholder image - replace with actual product images later */}
              <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-t-lg bg-gray-200 lg:aspect-none lg:h-80">
                <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-500">
                  Product Image
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      <a href={`/ecommerce/products/${product.id}`}>
                        <span aria-hidden="true" className="absolute inset-0" />
                        {product.name}
                      </a>
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</p>
                </div>

                {product.inventory_count <= 5 && product.inventory_count > 0 && (
                  <p className="mt-2 text-sm text-orange-600">
                    Only {product.inventory_count} left in stock
                  </p>
                )}
                {product.inventory_count === 0 && (
                  <p className="mt-2 text-sm text-red-600">
                    Out of stock
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
