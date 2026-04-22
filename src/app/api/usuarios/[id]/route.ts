import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { registrarLog } from "@/lib/auditoria";
import { TODOS_SETORES } from "@/lib/setores";
import type { Setor } from "@/lib/setores";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    if (session.perfilAcesso !== "ADMIN") {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const { nome, email, perfilAcesso, ativo, permissoes, setores } = await request.json();

    if (!nome?.trim() || !email?.trim()) {
      return Response.json({ error: "Nome e email são obrigatórios" }, { status: 400 });
    }

    const perfilFinal = perfilAcesso === "ADMIN" ? "ADMIN" : "USUARIO";

    if (session.id === id && (perfilFinal !== "ADMIN" || ativo === false)) {
      return Response.json(
        { error: "Você não pode rebaixar ou desativar sua própria conta de administrador" },
        { status: 400 }
      );
    }

    const emailConflito = await prisma.usuario.findFirst({
      where: { email: email.trim(), NOT: { id } },
    });
    if (emailConflito) {
      return Response.json({ error: "Email já está em uso por outro usuário" }, { status: 409 });
    }

    const permissoesFinal =
      permissoes && typeof permissoes === "object" && !Array.isArray(permissoes)
        ? permissoes
        : {};

    const setoresFinal: Setor[] = Array.isArray(setores)
      ? setores.filter((s: unknown) => TODOS_SETORES.includes(s as Setor))
      : [];

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        nome: nome.trim(),
        email: email.trim(),
        perfilAcesso: perfilFinal,
        ativo: ativo !== undefined ? Boolean(ativo) : true,
        permissoes: permissoesFinal,
        setores: setoresFinal,
      },
      select: { id: true, nome: true, email: true, perfilAcesso: true, ativo: true, createdAt: true, permissoes: true, setores: true },
    });

    registrarLog({ usuarioId: session.id, acao: "EDITAR", entidade: "Usuário", entidadeId: id, descricao: `Editou o usuário "${nome}" (${email})` });
    return Response.json(usuario);
  } catch (error) {
    console.error("[PUT /api/usuarios/[id]]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    if (session.perfilAcesso !== "ADMIN") {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;

    if (session.id === id) {
      return Response.json({ error: "Você não pode excluir sua própria conta" }, { status: 400 });
    }

    const usr = await prisma.usuario.findUnique({ where: { id }, select: { nome: true, email: true } });
    await prisma.usuario.delete({ where: { id } });
    registrarLog({ usuarioId: session.id, acao: "EXCLUIR", entidade: "Usuário", entidadeId: id, descricao: `Excluiu o usuário "${usr?.nome ?? id}" (${usr?.email ?? ""})` });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/usuarios/[id]]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
