// Define the type for a user
export interface User {
  username: string;
  email: string;
  avatar: string;
  accountId: string;
  // The owner's own UPI ID, put in rent reminders when they entered one (Edit profile)
  upi_id?: string | null;
  $id: string;
  $tenant: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: any[];
  $databaseId: string;
}
