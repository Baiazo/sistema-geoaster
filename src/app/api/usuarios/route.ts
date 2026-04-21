import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { registrarLog } from "@/lib/auditoria";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    if (session.perfilAcesso !== "ADMIN") {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }

    const usuarios = await prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, perfilAcesso: true, ativo: true, createdAt: true, permissoes: true },
      orderBy: { nome: "asc" },
    });

    return Response.json(usuarios);
  } catch (error) {
    console.error("[GET /api/usuarios]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    if (session.perfilAcesso !== "ADMIN") {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { nome, email, senha, perfilAcesso } = await request.json();

    if (!nome || !email || !senha) {
      return Response.json({ error: "Nome, email e senha são obrigatórios" }, { status: 400 });
    }

    if (typeof senha !== "string" || senha.length < 8) {
      return Response.json({ error: "Senha deve ter no mínimo 8 caracteres" }, { status: 400 });
    }

    const perfilFinal = perfilAcesso === "ADMIN" ? "ADMIN" : "USUARIO";

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return Response.json({ error: "Email já cadastrado" }, { status: 409 });
    }

    const hash = await bcrypt.hash(senha, 12);
    const usuario = await prisma.usuario.create({
      data: { nome, email, senha: hash, perfilAcesso: perfilFinal },
      select: { id: true, nome: true, email: true, perfilAcesso: true, createdAt: true },
    });

    registrarLog({ usuarioId: session.id, acao: "CRIAR", entidade: "Usuário", entidadeId: usuario.id, descricao: `Criou o usuário "${nome}" (${email})` });
    return Response.json(usuario, { status: 201 });
  } catch (error) {
    console.error("[POST /api/usuarios]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
