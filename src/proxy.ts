import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/protocolo", "/api/auth", "/api/protocolo"];

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-DNS-Prefetch-Control": "off",
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return applySecurityHeaders(NextResponse.next());

  const token = request.cookies.get("geoaster_token");

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Não autenticado" }, { status: 401 })
      );
    }
    return applySecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }

  const payload = verifyToken(token.value);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
      response.cookies.delete("geoaster_token");
      return applySecurityHeaders(response);
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("geoaster_token");
    return applySecurityHeaders(response);
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.webp|.*\\.ico).*)"],
};
