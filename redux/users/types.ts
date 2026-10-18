// The user row of the users table (the SDK's Row, and the columns below)
import type { Models } from "react-native-appwrite";

// Define the type for a user
export interface User extends Models.Row {
  username: string;
  email: string;
  avatar: string;
  accountId: string;
  // The owner's own UPI ID, put in rent reminders when they entered one (Edit profile)
  upi_id?: string | null;
}
