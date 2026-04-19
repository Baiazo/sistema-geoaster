import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { registrarLog } from "@/lib/auditoria";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarColaboradores) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const { nome, cpf, email, cargo, ativo } = await request.json();

    if (!nome) return Response.json({ error: "Nome é obrigatório" }, { status: 400 });

    if (cpf) {
      const existente = await prisma.colaborador.findFirst({
        where: { cpf, NOT: { id } },
      });
      if (existente) return Response.json({ error: "CPF já cadastrado" }, { status: 409 });
    }

    const colaborador = await prisma.colaborador.update({
      where: { id },
      data: {
        nome,
        cpf: cpf || null,
        email: email || null,
        cargo: cargo || null,
        ativo: ativo ?? true,
      },
    });

    registrarLog({ usuarioId: session.id, acao: "EDITAR", entidade: "Colaborador", entidadeId: id, descricao: `Editou o colaborador "${nome}"` });
    return Response.json(colaborador);
  } catch (error) {
    console.error("[PUT /api/colaboradores/[id]]", error);
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
    if (!perm.cadastrarColaboradores) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;

    // Remove responsável de equipes que referenciam este colaborador
    await prisma.equipe.updateMany({
      where: { responsavelId: id },
      data: { responsavelId: null },
    });

    const col = await prisma.colaborador.findUnique({ where: { id }, select: { nome: true } });
    await prisma.colaborador.delete({ where: { id } });
    registrarLog({ usuarioId: session.id, acao: "EXCLUIR", entidade: "Colaborador", entidadeId: id, descricao: `Excluiu o colaborador "${col?.nome ?? id}"` });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/colaboradores/[id]]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
