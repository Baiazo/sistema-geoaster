import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function getDateFrom(periodo: string): Date | undefined {
  const now = new Date();
  switch (periodo) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    default:
      return undefined;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const periodo = request.nextUrl.searchParams.get("periodo") || "all";
    const from = getDateFrom(periodo);
    const dateFilter = from ? { createdAt: { gte: from } } : {};

    const agora = new Date();
    const limiteVencimento = new Date(agora);
    limiteVencimento.setDate(limiteVencimento.getDate() + 7);

    const [
      totalClientes,
      totalPropriedades,
      totalProcessos,
      totalDocumentos,
      processosPorStatus,
      processosRecentes,
      orcamentosVencendo,
    ] = await Promise.all([
      prisma.cliente.count({ where: { ativo: true, ...dateFilter } }),
      prisma.propriedade.count({ where: dateFilter }),
      prisma.processo.count({ where: dateFilter }),
      prisma.documento.count({ where: dateFilter }),
      prisma.processo.groupBy({ by: ["status"], _count: true, where: dateFilter }),
      prisma.processo.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        where: dateFilter,
        include: { cliente: { select: { nome: true } } },
      }),
      prisma.orcamento.findMany({
        where: {
          status: "PENDENTE",
          validadeAte: { not: null, lte: limiteVencimento },
        },
        orderBy: { validadeAte: "asc" },
        take: 5,
        include: {
          cliente: { select: { nome: true } },
        },
      }),
    ]);

    return Response.json({
      totalClientes,
      totalPropriedades,
      totalProcessos,
      totalDocumentos,
      processosPorStatus,
      processosRecentes,
      orcamentosVencendo,
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
