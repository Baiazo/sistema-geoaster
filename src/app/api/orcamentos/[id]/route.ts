import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { registrarLog } from "@/lib/auditoria";

const STATUS_VALIDOS = new Set(["PENDENTE", "APROVADO", "REJEITADO"] as const);
type StatusOrcamento = "PENDENTE" | "APROVADO" | "REJEITADO";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.verOrcamentos) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: {
        cliente: true,
        propriedade: true,
        processo: { select: { id: true, protocolo: true, status: true } },
        criadoPor: { select: { id: true, nome: true } },
      },
    });

    if (!orcamento) return Response.json({ error: "Orçamento não encontrado" }, { status: 404 });
    return Response.json(orcamento);
  } catch (error) {
    console.error("[GET /api/orcamentos/:id]", error);
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
    if (!perm.cadastrarOrcamentos) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const existente = await prisma.orcamento.findUnique({ where: { id }, select: { status: true, protocolo: true } });
    if (!existente) return Response.json({ error: "Orçamento não encontrado" }, { status: 404 });
    if (existente.status === "APROVADO") {
      return Response.json({ error: "Orçamento aprovado não pode ser editado" }, { status: 400 });
    }

    const body = await request.json();
    const {
      propriedadeId,
      tipoServico,
      descricao,
      valor,
      condicoesPagamento,
      prazoExecucaoDias,
      validadeAte,
      observacoes,
      status,
      motivoRejeicao,
    } = body;

    if (status !== undefined && !STATUS_VALIDOS.has(status)) {
      return Response.json({ error: "Status inválido" }, { status: 400 });
    }
    if (status === "APROVADO") {
      return Response.json({ error: "Use o endpoint de aprovação para aprovar o orçamento" }, { status: 400 });
    }

    const motivoTrim = typeof motivoRejeicao === "string" ? motivoRejeicao.trim() : "";
    if (status === "REJEITADO" && !motivoTrim) {
      return Response.json({ error: "Informe o motivo da rejeição" }, { status: 400 });
    }

    const orcamento = await prisma.orcamento.update({
      where: { id },
      data: {
        ...(propriedadeId !== undefined ? { propriedadeId: propriedadeId || null } : {}),
        ...(tipoServico ? { tipoServico } : {}),
        ...(descricao !== undefined ? { descricao: descricao || null } : {}),
        ...(valor !== undefined
          ? { valor: valor !== null && valor !== "" ? Number(valor) : null }
          : {}),
        ...(condicoesPagamento !== undefined
          ? { condicoesPagamento: condicoesPagamento || null }
          : {}),
        ...(prazoExecucaoDias !== undefined
          ? {
              prazoExecucaoDias:
                prazoExecucaoDias !== null && prazoExecucaoDias !== ""
                  ? Number(prazoExecucaoDias)
                  : null,
            }
          : {}),
        ...(validadeAte !== undefined
          ? { validadeAte: validadeAte ? new Date(validadeAte) : null }
          : {}),
        ...(observacoes !== undefined ? { observacoes: observacoes || null } : {}),
        ...(status ? { status: status as StatusOrcamento } : {}),
        ...(status === "REJEITADO" ? { motivoRejeicao: motivoTrim } : {}),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        propriedade: { select: { id: true, nome: true } },
      },
    });

    registrarLog({
      usuarioId: session.id,
      acao: "EDITAR",
      entidade: "Orcamento",
      entidadeId: id,
      descricao: status === "REJEITADO"
        ? `Orçamento ${orcamento.protocolo} rejeitado — ${motivoTrim}`
        : status
        ? `Orçamento ${orcamento.protocolo} → status ${status}`
        : `Editou o orçamento ${orcamento.protocolo}`,
    });

    return Response.json(orcamento);
  } catch (error) {
    console.error("[PUT /api/orcamentos/:id]", error);
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
    if (session.perfilAcesso !== "ADMIN") {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const orc = await prisma.orcamento.findUnique({
      where: { id },
      select: { protocolo: true, status: true },
    });
    if (!orc) return Response.json({ error: "Orçamento não encontrado" }, { status: 404 });
    if (orc.status === "APROVADO") {
      return Response.json(
        { error: "Orçamento aprovado não pode ser excluído (já virou processo)" },
        { status: 400 }
      );
    }

    await prisma.orcamento.delete({ where: { id } });
    registrarLog({
      usuarioId: session.id,
      acao: "EXCLUIR",
      entidade: "Orcamento",
      entidadeId: id,
      descricao: `Excluiu o orçamento ${orc.protocolo}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/orcamentos/:id]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
