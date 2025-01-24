import { getXataClient } from "@/lib/xata";
import { notFound } from "next/navigation";

const xata = getXataClient();

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await xata.db.products
    .filter({
      xata_id: params.id,
      deleted_at: null,
      is_active: true,
    })
    .getFirst();

  console.log("Product:", product);

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="max-w-4xl mx-auto">
        <div className="gnome-card">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gnome-dark dark:text-white">
                {product.name}
              </h1>

              <div className="prose dark:prose-invert">
                <p className="text-gnome-dark/70 dark:text-white/70">
                  {product.description || "No description available."}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-gnome-dark dark:text-white">
                    ${product.price.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gnome-dark/60 dark:text-white/60">
                    Stock:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      product.inventory_count > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {product.inventory_count > 0
                      ? `${product.inventory_count} available`
                      : "Out of stock"}
                  </span>
                </div>
              </div>

              {product.inventory_count > 0 && (
                <div className="pt-4">
                  <button
                    type="button"
                    className="w-full bg-gnome-blue hover:bg-gnome-blue/90 text-white font-medium py-3 px-6 rounded-md transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              )}
            </div>

            <div className="bg-gnome-dark/5 dark:bg-white/5 rounded-lg p-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gnome-dark dark:text-white">
                  Product Details
                </h2>

                <dl className="space-y-2">
                  {product.sku && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gnome-dark/60 dark:text-white/60">
                        SKU
                      </dt>
                      <dd className="text-sm text-gnome-dark dark:text-white">
                        {product.sku}
                      </dd>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <dt className="text-sm text-gnome-dark/60 dark:text-white/60">
                      Category
                    </dt>
                    <dd className="text-sm text-gnome-dark dark:text-white">
                      General
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
