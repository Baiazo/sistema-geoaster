import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

// Formato esperado: GEO-YYYY-NNNNNN (6 dígitos). Valida no servidor para evitar
// consultas inválidas e scripts de enumeração que não seguem o padrão.
const PROTOCOLO_REGEX = /^GEO-\d{4}-\d{6}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ numero: string }> }
) {
  try {
    const ip = getClientIp(request);

    // Rate limit por IP: 30 consultas por minuto (protege contra enumeração e DoS)
    const limit = rateLimit(`protocolo:${ip}`, 30, 60);
    if (!limit.ok) {
      return Response.json(
        { error: "Muitas consultas. Tente novamente em alguns instantes." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const { numero } = await params;
    const numeroUpper = numero.toUpperCase();

    if (!PROTOCOLO_REGEX.test(numeroUpper)) {
      return Response.json({ error: "Protocolo não encontrado" }, { status: 404 });
    }

    const processo = await prisma.processo.findUnique({
      where: { protocolo: numeroUpper },
      include: {
        cliente: { select: { nome: true } },
        propriedade: { select: { nome: true, municipio: true } },
        equipe: {
          select: {
            nome: true,
            telefone: true,
            responsavel: { select: { nome: true } },
          },
        },
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
      equipe: processo.equipe?.nome ?? null,
      equipeResponsavel: processo.equipe?.responsavel?.nome ?? null,
      equipeTelefone: processo.equipe?.telefone ?? null,
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
