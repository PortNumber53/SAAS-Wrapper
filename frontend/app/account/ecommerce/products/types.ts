export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  inventory_count: number;
  deleted_at?: string | null;
  is_active: boolean;
  category_id?: string;
  images?: string[];
  sku?: string;
  meta?: {
    stripe_price_id?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
};
