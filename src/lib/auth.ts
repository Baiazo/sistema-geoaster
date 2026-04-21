import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { Permissoes } from "@/lib/permissoes";

const COOKIE_NAME = "geoaster_token";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET ausente ou com menos de 32 caracteres. Defina um segredo forte no .env antes de rodar em produção."
      );
    }
    // Em desenvolvimento, apenas avisa no console para não travar o fluxo local.
    // NÃO use esse fallback em produção.
    if (!globalThis.__geoaster_jwt_dev_warned) {
      console.warn(
        "[auth] JWT_SECRET fraco/ausente — usando fallback de desenvolvimento. Defina JWT_SECRET no .env (>=32 chars)."
      );
      globalThis.__geoaster_jwt_dev_warned = true;
    }
    return "dev-only-insecure-fallback-do-not-use-in-production-geoaster";
  }
  return secret;
}

declare global {
  var __geoaster_jwt_dev_warned: boolean | undefined;
}

export interface JWTPayload {
  id: string;
  email: string;
  nome: string;
  perfilAcesso: "ADMIN" | "USUARIO";
  permissoes: Permissoes;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "8h", issuer: "geoaster" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret(), { issuer: "geoaster" }) as JWTPayload;
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
