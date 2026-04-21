import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { enviarWhatsApp, montarMensagemProtocolo } from "@/lib/whatsapp";
import { registrarLog } from "@/lib/auditoria";

const STATUS_VALIDOS = new Set(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO"] as const);
type StatusProcesso = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.verProcessos) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const processo = await prisma.processo.findUnique({
      where: { id },
      include: {
        cliente: true,
        propriedade: true,
        equipe: {
          include: {
            responsavel: { select: { id: true, nome: true } },
            membros: { include: { colaborador: { select: { id: true, nome: true } } } },
          },
        },
        historico: { orderBy: { createdAt: "desc" } },
        documentos: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!processo) return Response.json({ error: "Processo não encontrado" }, { status: 404 });
    return Response.json(processo);
  } catch (error) {
    console.error("[GET /api/processos/:id]", error);
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
    if (!perm.cadastrarProcessos) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { status, observacoes, descricaoHistorico, dataFim, tipoServico, propriedadeId, equipeId, valor } = body;

    if (status !== undefined && status !== null && !STATUS_VALIDOS.has(status)) {
      return Response.json({ error: "Status inválido" }, { status: 400 });
    }

    const statusTyped = status as StatusProcesso | undefined;

    const processo = await prisma.processo.update({
      where: { id },
      data: {
        ...(statusTyped ? { status: statusTyped } : {}),
        ...(observacoes !== undefined ? { observacoes } : {}),
        ...(dataFim !== undefined ? { dataFim: dataFim ? new Date(dataFim) : null } : {}),
        ...(tipoServico ? { tipoServico } : {}),
        ...(propriedadeId !== undefined ? { propriedadeId: propriedadeId || null } : {}),
        ...(equipeId !== undefined ? { equipeId: equipeId || null } : {}),
        ...(valor !== undefined ? { valor: valor ? Number(valor) : null } : {}),
        ...(statusTyped
          ? {
              historico: {
                create: {
                  descricao: descricaoHistorico || `Status alterado para ${statusTyped}`,
                  status: statusTyped,
                },
              },
            }
          : {}),
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        propriedade: { select: { id: true, nome: true } },
        historico: { orderBy: { createdAt: "desc" } },
      },
    });

    registrarLog({ usuarioId: session.id, acao: "EDITAR", entidade: "Processo", entidadeId: id, descricao: statusTyped ? `Atualizou processo ${processo.protocolo} → status ${statusTyped}` : `Editou o processo ${processo.protocolo}` });

    if (statusTyped && processo.cliente.telefone) {
      const mensagem = montarMensagemProtocolo({
        nomeCliente: processo.cliente.nome,
        nomeServico: processo.tipoServico,
        status: statusTyped,
        protocolo: processo.protocolo,
      });
      enviarWhatsApp(processo.cliente.telefone, mensagem).catch(() => {});
    }

    return Response.json(processo);
  } catch (error) {
    console.error("[PUT /api/processos/:id]", error);
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
    const proc = await prisma.processo.findUnique({ where: { id }, select: { protocolo: true } });
    await prisma.processo.delete({ where: { id } });
    registrarLog({ usuarioId: session.id, acao: "EXCLUIR", entidade: "Processo", entidadeId: id, descricao: `Excluiu o processo ${proc?.protocolo ?? id}` });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/processos/:id]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
