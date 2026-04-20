import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { registrarLog } from "@/lib/auditoria";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.verEquipes) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;

    const equipe = await prisma.equipe.findUnique({
      where: { id },
      include: {
        responsavel: { select: { id: true, nome: true, cargo: true, email: true } },
        membros: {
          include: {
            colaborador: { select: { id: true, nome: true, cargo: true, email: true } },
          },
        },
        processos: {
          orderBy: { createdAt: "desc" },
          include: {
            cliente: { select: { id: true, nome: true } },
            propriedade: { select: { id: true, nome: true, municipio: true } },
          },
        },
      },
    });

    if (!equipe) return Response.json({ error: "Equipe não encontrada" }, { status: 404 });

    return Response.json(equipe);
  } catch (error) {
    console.error("[GET /api/equipes/[id]]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarEquipes) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const { nome, telefone, responsavelId, membrosIds, ativo } = await request.json();

    if (!nome) return Response.json({ error: "Nome é obrigatório" }, { status: 400 });

    await prisma.equipeColaborador.deleteMany({ where: { equipeId: id } });

    const equipe = await prisma.equipe.update({
      where: { id },
      data: {
        nome,
        telefone: telefone || null,
        responsavelId: responsavelId || null,
        ativo: ativo ?? true,
        membros: membrosIds?.length
          ? { create: membrosIds.map((colaboradorId: string) => ({ colaboradorId })) }
          : undefined,
      },
      include: {
        responsavel: { select: { id: true, nome: true } },
        membros: { include: { colaborador: { select: { id: true, nome: true } } } },
      },
    });

    registrarLog({ usuarioId: session.id, acao: "EDITAR", entidade: "Equipe", entidadeId: id, descricao: `Editou a equipe "${nome}"` });
    return Response.json(equipe);
  } catch (error) {
    console.error("[PUT /api/equipes/[id]]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarEquipes) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;

    const eq = await prisma.equipe.findUnique({ where: { id }, select: { nome: true } });
    await prisma.equipe.update({ where: { id }, data: { ativo: false } });
    registrarLog({ usuarioId: session.id, acao: "EXCLUIR", entidade: "Equipe", entidadeId: id, descricao: `Excluiu a equipe "${eq?.nome ?? id}"` });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/equipes/[id]]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
