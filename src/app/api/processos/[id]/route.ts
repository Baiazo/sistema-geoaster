import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { enviarWhatsApp, montarMensagemProtocolo } from "@/lib/whatsapp";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const processo = await prisma.processo.findUnique({
      where: { id },
      include: {
        cliente: true,
        propriedade: true,
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

    const { id } = await params;
    const body = await request.json();
    const { status, observacoes, descricaoHistorico, dataFim, tipoServico, propriedadeId } = body;

    const processo = await prisma.processo.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(observacoes !== undefined ? { observacoes } : {}),
        ...(dataFim !== undefined ? { dataFim: dataFim ? new Date(dataFim) : null } : {}),
        ...(tipoServico ? { tipoServico } : {}),
        ...(propriedadeId !== undefined ? { propriedadeId: propriedadeId || null } : {}),
        ...(status
          ? {
              historico: {
                create: {
                  descricao: descricaoHistorico || `Status alterado para ${status}`,
                  status,
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

    // Dispara notificação WhatsApp se status mudou e cliente tem telefone
    if (status && processo.cliente.telefone) {
      const mensagem = montarMensagemProtocolo({
        nomeCliente: processo.cliente.nome,
        nomeServico: processo.tipoServico,
        status,
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
    await prisma.processo.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/processos/:id]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
