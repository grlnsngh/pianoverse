// Define the type for a user
export interface User {
  username: string;
  email: string;
  avatar: string;
  accountId: string;
  $id: string;
  $tenant: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: any[];
  $databaseId: string;
}
