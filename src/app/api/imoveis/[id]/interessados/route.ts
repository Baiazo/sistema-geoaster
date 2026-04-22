import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarImoveis) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id: imovelId } = await params;
    const { clienteId } = await request.json();

    if (!clienteId) return Response.json({ error: "Cliente é obrigatório" }, { status: 400 });

    await prisma.imovelInteressado.create({ data: { imovelId, clienteId } });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/imoveis/:id/interessados]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarImoveis) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id: imovelId } = await params;
    const { clienteId } = await request.json();

    await prisma.imovelInteressado.delete({ where: { imovelId_clienteId: { imovelId, clienteId } } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/imoveis/:id/interessados]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
