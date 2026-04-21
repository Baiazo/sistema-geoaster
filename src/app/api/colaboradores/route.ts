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
    if (!perm.verColaboradores) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const colaboradores = await prisma.colaborador.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: {
        _count: { select: { equipesComoMembro: true, equipesComoResponsavel: true } },
      },
    });

    const resultado = colaboradores.map((c: (typeof colaboradores)[number]) => ({
      ...c,
      _count: {
        equipesComoMembro: c._count.equipesComoMembro + c._count.equipesComoResponsavel,
      },
    }));

    return Response.json(resultado);
  } catch (error) {
    console.error("[GET /api/colaboradores]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarColaboradores) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { nome, cpf, email, cargo } = await request.json();

    if (!nome) return Response.json({ error: "Nome é obrigatório" }, { status: 400 });

    if (cpf) {
      const existente = await prisma.colaborador.findUnique({ where: { cpf } });
      if (existente) {
        if (!existente.ativo) {
          // Registro inativo (excluído antes do hard delete ser implementado) — limpa e recria
          await prisma.equipe.updateMany({ where: { responsavelId: existente.id }, data: { responsavelId: null } });
          await prisma.colaborador.delete({ where: { id: existente.id } });
        } else {
          return Response.json({ error: "CPF já cadastrado" }, { status: 409 });
        }
      }
    }

    const colaborador = await prisma.colaborador.create({
      data: { nome, cpf: cpf || null, email: email || null, cargo: cargo || null },
    });

    registrarLog({ usuarioId: session.id, acao: "CRIAR", entidade: "Colaborador", entidadeId: colaborador.id, descricao: `Criou o colaborador "${nome}"${cargo ? ` (${cargo})` : ""}` });
    return Response.json(colaborador, { status: 201 });
  } catch (error) {
    console.error("[POST /api/colaboradores]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}