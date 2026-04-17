import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return Response.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario || !usuario.ativo) {
      return Response.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return Response.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const token = signToken({
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfilAcesso: usuario.perfilAcesso,
    });

    const cookie = setAuthCookie(token);
    const response = Response.json({
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfilAcesso: usuario.perfilAcesso },
    });

    response.headers.set(
      "Set-Cookie",
      `${cookie.name}=${cookie.value}; Path=${cookie.path}; Max-Age=${cookie.maxAge}; HttpOnly; SameSite=Lax${cookie.secure ? "; Secure" : ""}`
    );

    return response;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
