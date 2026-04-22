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
    const { clienteId, data, observacoes } = await request.json();

    if (!data) return Response.json({ error: "Data é obrigatória" }, { status: 400 });

    const visita = await prisma.visitaImovel.create({
      data: {
        imovelId,
        clienteId: clienteId || null,
        data: new Date(data),
        observacoes,
      },
      include: { cliente: { select: { id: true, nome: true } } },
    });

    return Response.json(visita, { status: 201 });
  } catch (error) {
    console.error("[POST /api/imoveis/:id/visitas]", error);
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

    const { visitaId } = await request.json();
    await prisma.visitaImovel.delete({ where: { id: visitaId } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/imoveis/:id/visitas]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
