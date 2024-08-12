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
  event_model_number?: string | null;
  event_purchase_from?: string | null;
  event_purchase_price?: number | null;
  image_url: string;
  make: string;
  on_sale_import_date?: Date | null;
  on_sale_price?: number | null;
  on_sale_purchase_from?: string | null;
  rental_customer_address?: string | null;
  rental_customer_mobile?: string | null;
  rental_customer_name?: string | null;
  rental_period_end?: Date | null;
  rental_period_start?: Date | null;
  rental_price?: number | null;
  sold_date?: Date | null;
  sold_price?: string | null;
  sold_to_address?: string | null;
  sold_to_name?: string | null;
  title: string;
  users: User;
  warehouse_since_date?: Date | null;
  company_associated?: string | null;
  date_of_purchase?: Date;
}

export interface PianoItemFormStateType {
  category: string;
  creator: string;
  description?: string;
  company_associated?: string | null;
  event_b_number?: string | null;
  event_model_number?: string | null;
  event_purchase_from?: string | null;
  event_purchase_price?: number | null;
  image_url: string;
  make: string;
  on_sale_import_date?: string | null; // Changed to string
  on_sale_price?: number | null;
  on_sale_purchase_from?: string | null;
  rental_customer_address?: string | null;
  rental_customer_mobile?: string | null;
  rental_customer_name?: string | null;
  rental_period_end?: string | null; // Changed to string
  rental_period_start?: string | null; // Changed to string
  rental_price?: number | null;
  sold_date?: string | null; // Changed to string
  sold_price?: string | null;
  sold_to_address?: string | null;
  sold_to_name?: string | null;
  title: string;
  users: User;
  warehouse_since_date?: string | null; // Changed to string
  date_of_purchase?: string; // Changed to string
}
