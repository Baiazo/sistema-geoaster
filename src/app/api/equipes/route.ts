import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { registrarLog } from "@/lib/auditoria";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.verEquipes) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const equipes = await prisma.equipe.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: {
        responsavel: { select: { id: true, nome: true, cargo: true } },
        membros: {
          include: { colaborador: { select: { id: true, nome: true, cargo: true } } },
        },
        _count: { select: { processos: true } },
      },
    });

    return Response.json(equipes);
  } catch (error) {
    console.error("[GET /api/equipes]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarEquipes) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { nome, responsavelId, membrosIds } = await request.json();

    if (!nome) return Response.json({ error: "Nome é obrigatório" }, { status: 400 });

    const equipe = await prisma.equipe.create({
      data: {
        nome,
        responsavelId: responsavelId || null,
        membros: membrosIds?.length
          ? { create: membrosIds.map((colaboradorId: string) => ({ colaboradorId })) }
          : undefined,
      },
      include: {
        responsavel: { select: { id: true, nome: true } },
        membros: { include: { colaborador: { select: { id: true, nome: true } } } },
      },
    });

    registrarLog({ usuarioId: session.id, acao: "CRIAR", entidade: "Equipe", entidadeId: equipe.id, descricao: `Criou a equipe "${nome}"` });
    return Response.json(equipe, { status: 201 });
  } catch (error) {
    console.error("[POST /api/equipes]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
