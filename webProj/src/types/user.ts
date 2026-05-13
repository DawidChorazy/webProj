export type UserRole = "guest" | "user" | "admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  blocked: boolean;
  createdAt: string;
  lastLoginAt?: string;
}