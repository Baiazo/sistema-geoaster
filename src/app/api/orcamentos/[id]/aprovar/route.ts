import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { registrarLog } from "@/lib/auditoria";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarOrcamentos) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const equipeId = typeof body?.equipeId === "string" && body.equipeId ? body.equipeId : null;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: { cliente: { select: { id: true } } },
    });

    if (!orcamento) return Response.json({ error: "Orçamento não encontrado" }, { status: 404 });
    if (orcamento.status === "APROVADO") {
      return Response.json({ error: "Orçamento já aprovado" }, { status: 400 });
    }
    if (orcamento.status === "REJEITADO") {
      return Response.json({ error: "Orçamento rejeitado não pode ser aprovado" }, { status: 400 });
    }

    const { processo } = await prisma.$transaction(async (tx) => {
      const processoCriado = await tx.processo.create({
        data: {
          protocolo: orcamento.protocolo,
          clienteId: orcamento.clienteId,
          propriedadeId: orcamento.propriedadeId,
          equipeId,
          tipoServico: orcamento.tipoServico,
          observacoes: orcamento.observacoes,
          valor: orcamento.valor,
          historico: {
            create: {
              descricao: "Processo criado a partir do orçamento aprovado",
              status: "PENDENTE",
            },
          },
        },
        include: {
          cliente: { select: { id: true, nome: true } },
          propriedade: { select: { id: true, nome: true } },
        },
      });

      await tx.orcamento.update({
        where: { id },
        data: { status: "APROVADO", processoId: processoCriado.id },
      });

      if (orcamento.propriedadeId) {
        await tx.documento.updateMany({
          where: { propriedadeId: orcamento.propriedadeId, processoId: null },
          data: { processoId: processoCriado.id },
        });
      }

      return { processo: processoCriado };
    });

    registrarLog({
      usuarioId: session.id,
      acao: "APROVAR",
      entidade: "Orcamento",
      entidadeId: id,
      descricao: `Aprovou o orçamento ${orcamento.protocolo} e criou o processo correspondente`,
    });

    // TODO: integrar envio via WhatsApp (API externa) — notificar o cliente
    // de que o orçamento foi aprovado e virou processo (protocolo: ${processo.protocolo}).

    return Response.json({ processo });
  } catch (error) {
    console.error("[POST /api/orcamentos/:id/aprovar]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
