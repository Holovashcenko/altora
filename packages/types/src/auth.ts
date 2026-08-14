/** Must stay in sync with the `UserRole` enum in `apps/api/prisma/schema.prisma`. */
export type UserRole = 'owner' | 'manager' | 'staff';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  /** Per-restaurant role when the user has an active membership */
  role?: UserRole;
  /** Active restaurant membership, if any */
  restaurant?: Restaurant;
  createdAt: string;
  updatedAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  timezone?: string;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantMember {
  userId: string;
  restaurantId: string;
  role: UserRole;
  createdAt: string;
}

export interface RestaurantSettings {
  timezone?: string;
  currency?: string;
}

export interface UpdateRestaurantRequest {
  name?: string;
  settings?: RestaurantSettings;
}

export interface AuthSession {
  user: AuthUser;
  restaurant: Restaurant;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  restaurantName?: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}
