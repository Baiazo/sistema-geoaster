import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { Permissoes } from "@/lib/permissoes";

const JWT_SECRET = process.env.JWT_SECRET || "geoaster-secret-key-change-in-production";
const COOKIE_NAME = "geoaster_token";

export interface JWTPayload {
  id: string;
  email: string;
  nome: string;
  perfilAcesso: "ADMIN" | "USUARIO";
  permissoes: Permissoes;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);
  if (!token) return null;
  return verifyToken(token.value);
}

export function setAuthCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 8,
    path: "/",
  };
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
