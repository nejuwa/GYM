import type { Role, AccountStatus } from "./index";
export interface AuthUser { id: string; email: string; username: string; role: Role; status?: AccountStatus; fullName: string; phone: string | null; avatarUrl: string | null; }
export interface LoginRequest { usernameOrEmail: string; password: string; }
export interface LoginResponse { success: true; message: string; token: string; refreshToken: string; user: AuthUser; }
