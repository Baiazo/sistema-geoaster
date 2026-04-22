import { NextRequest } from "next/server";
import { getSession, signToken, setAuthCookie } from "@/lib/auth";
import { TODOS_SETORES } from "@/lib/setores";
import type { Setor } from "@/lib/setores";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const { setor } = await request.json();

    if (!setor || !TODOS_SETORES.includes(setor as Setor)) {
      return Response.json({ error: "Setor inválido" }, { status: 400 });
    }

    if (!session.setores.includes(setor as Setor)) {
      return Response.json({ error: "Sem acesso a este setor" }, { status: 403 });
    }

    const { id, email, nome, perfilAcesso, permissoes, setores } = session;
    const token = signToken({ id, email, nome, perfilAcesso, permissoes, setores, setorAtivo: setor as Setor });
    const cookie = setAuthCookie(token);

    const response = Response.json({ setorAtivo: setor });
    response.headers.set(
      "Set-Cookie",
      `${cookie.name}=${cookie.value}; Path=${cookie.path}; Max-Age=${cookie.maxAge}; HttpOnly; SameSite=Lax`
    );

    return response;
  } catch (error) {
    console.error("[POST /api/auth/setor]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
