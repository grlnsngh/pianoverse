import { User } from "../users/types";

// Define the type for a piano item
export interface PianoItem {
  $collectionId: string;
  $createdAt: string;
  $databaseId: string;
  $id: string;
  $permissions: any[];
  $tenant: string;
  $updatedAt: string;
  category: string;
  creator: string;
  description?: string;
  event_b_number?: string | null;
  event_company_associated?: string | null;
  event_model_number?: string | null;
  event_purchase_from?: string | null;
  event_purchase_price?: string | null;
  image_url: string;
  make: string;
  on_sale_import_date?: Date | null;
  on_sale_price?: string | null;
  on_sale_purchase_from?: string | null;
  rental_customer_address?: string;
  rental_customer_mobile?: string;
  rental_customer_name?: string;
  rental_period_end?: Date;
  rental_period_start?: Date;
  rental_price?: number;
  sold_date?: Date | null;
  sold_price?: string | null;
  sold_to_address?: string | null;
  sold_to_name?: string | null;
  title: string;
  users: User;
  warehouse_since_date?: Date | null;
}
