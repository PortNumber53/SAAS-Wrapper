import { Suspense } from 'react'
import { ProductCatalog } from './ProductCatalog'
import { getProducts } from '@/app/account/ecommerce/products/actions'

export const runtime = 'edge'

export default async function BrowsePage() {
  const products = await getProducts()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Products</h1>
          <div className="flex items-center gap-x-4">
            {/* Add sorting/filtering controls here later */}
          </div>
        </div>

        <Suspense fallback={<ProductCatalogSkeleton />}>
          <ProductCatalog products={products || []} />
        </Suspense>
      </div>
    </div>
  )
}

function ProductCatalogSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="group relative animate-pulse">
          <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none lg:h-80" />
          <div className="mt-4 flex justify-between">
            <div>
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="mt-1 h-4 w-24 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
