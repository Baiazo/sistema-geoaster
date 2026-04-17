import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ numero: string }> }
) {
  try {
    const { numero } = await params;

    const processo = await prisma.processo.findUnique({
      where: { protocolo: numero.toUpperCase() },
      include: {
        cliente: { select: { nome: true } },
        propriedade: { select: { nome: true, municipio: true } },
        historico: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!processo) {
      return Response.json({ error: "Protocolo não encontrado" }, { status: 404 });
    }

    return Response.json({
      protocolo: processo.protocolo,
      tipoServico: processo.tipoServico,
      status: processo.status,
      dataInicio: processo.dataInicio,
      dataFim: processo.dataFim,
      cliente: processo.cliente.nome,
      propriedade: processo.propriedade
        ? `${processo.propriedade.nome} - ${processo.propriedade.municipio}`
        : null,
      historico: processo.historico.map((h: { descricao: string; status: string; createdAt: Date }) => ({
        descricao: h.descricao,
        status: h.status,
        data: h.createdAt,
      })),
    });
  } catch (error) {
    console.error("[GET /api/protocolo/:numero]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
