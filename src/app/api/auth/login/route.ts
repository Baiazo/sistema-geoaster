import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { registrarLog } from "@/lib/auditoria";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Rate limit por IP: 8 tentativas por minuto
    const ipLimit = rateLimit(`login:ip:${ip}`, 8, 60);
    if (!ipLimit.ok) {
      return Response.json(
        { error: "Muitas tentativas. Tente novamente em alguns instantes." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } }
      );
    }

    const { email, senha } = await request.json();

    if (!email || !senha || typeof email !== "string" || typeof senha !== "string") {
      return Response.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
    }

    // Rate limit adicional por email (evita spray de senhas num alvo único)
    const emailLimit = rateLimit(`login:email:${email.toLowerCase()}`, 10, 300);
    if (!emailLimit.ok) {
      return Response.json(
        { error: "Muitas tentativas para este usuário. Tente novamente em alguns minutos." },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSeconds) } }
      );
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario || !usuario.ativo) {
      return Response.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return Response.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const permissoes = getPermissoesEfetivas(usuario.perfilAcesso, usuario.permissoes);

    const token = signToken({
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfilAcesso: usuario.perfilAcesso,
      permissoes,
    });

    registrarLog({ usuarioId: usuario.id, acao: "LOGIN", entidade: "Usuário", descricao: `Login: ${usuario.email}` });

    const cookie = setAuthCookie(token);
    const response = Response.json({
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfilAcesso: usuario.perfilAcesso },
    });

    response.headers.set(
      "Set-Cookie",
      `${cookie.name}=${cookie.value}; Path=${cookie.path}; Max-Age=${cookie.maxAge}; HttpOnly; SameSite=Lax`
    );

    return response;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}