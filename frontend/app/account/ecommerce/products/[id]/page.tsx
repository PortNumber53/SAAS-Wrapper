import { getXataClient } from "@/lib/xata";
import { notFound } from "next/navigation";
import { auth } from "@/app/auth";

export const runtime = "edge";

const xata = getXataClient();

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const product = await xata.db.products
    .filter({
      id: params.id,
      deleted_at: null,
    })
    .getFirst();

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="gnome-header">Product Details</h1>
      </div>

      <div className="gnome-card">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-gnome-dark dark:text-white mb-6">
              {product.name}
            </h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gnome-dark/60 dark:text-white/60">
                  Description
                </dt>
                <dd className="text-gnome-dark dark:text-white mt-1">
                  {product.description || "-"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gnome-dark/60 dark:text-white/60">
                  Price
                </dt>
                <dd className="text-gnome-dark dark:text-white mt-1">
                  ${product.price.toFixed(2)}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gnome-dark/60 dark:text-white/60">
                  Inventory Count
                </dt>
                <dd className="text-gnome-dark dark:text-white mt-1">
                  {product.inventory_count}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gnome-dark/60 dark:text-white/60">
                  SKU
                </dt>
                <dd className="text-gnome-dark dark:text-white mt-1">
                  {product.sku || "-"}
                </dd>
              </div>

              {product.meta?.stripe_price_id && (
                <div>
                  <dt className="text-sm text-gnome-dark/60 dark:text-white/60">
                    Stripe Price ID
                  </dt>
                  <dd className="text-gnome-dark dark:text-white mt-1">
                    {product.meta.stripe_price_id}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gnome-dark dark:text-white mb-4">
              Product Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <div
                  className={`h-2.5 w-2.5 rounded-full mr-2 ${
                    product.is_active ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-gnome-dark dark:text-white">
                  {product.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
