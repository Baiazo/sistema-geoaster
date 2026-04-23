import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";

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

    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);

    const periodo = request.nextUrl.searchParams.get("periodo") || "all";
    const from = getDateFrom(periodo);
    const dateFilter = from ? { createdAt: { gte: from } } : {};

    // Dashboard por setor
    const setor = session.setorAtivo;

    if (setor === "IMOVEIS" && perm.verImoveis) {
      const [
        totalImoveis,
        totalDisponiveis,
        totalVendidos,
        totalExclusivos,
        imoveisPorStatus,
        imoveisRecentes,
        totalInteressados,
        totalVisitas,
      ] = await Promise.all([
        prisma.imovel.count({ where: dateFilter }),
        prisma.imovel.count({ where: { status: "DISPONIVEL", ...dateFilter } }),
        prisma.imovel.count({ where: { status: "VENDIDO", ...dateFilter } }),
        prisma.imovel.count({ where: { exclusividade: true, ...dateFilter } }),
        prisma.imovel.groupBy({ by: ["status"], _count: true, where: dateFilter }),
        prisma.imovel.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          where: dateFilter,
          include: { cliente: { select: { nome: true } }, corretor: { select: { nome: true } } },
        }),
        prisma.imovelInteressado.count(),
        prisma.visitaImovel.count(),
      ]);

      return Response.json({
        setor: "IMOVEIS",
        totalImoveis,
        totalDisponiveis,
        totalVendidos,
        totalExclusivos,
        imoveisPorStatus,
        imoveisRecentes,
        totalInteressados,
        totalVisitas,
      });
    }

    // Dashboard padrão (GEO / AMBIENTAL / sem setor)
    const agora = new Date();
    const limiteVencimento = new Date(agora);
    limiteVencimento.setDate(limiteVencimento.getDate() + 7);

    const setorFilter = setor && setor !== "IMOVEIS" ? { setores: { has: setor } } : {};

    const [
      totalClientes,
      totalPropriedades,
      totalProcessos,
      totalDocumentos,
      processosPorStatus,
      processosRecentes,
      orcamentosVencendo,
    ] = await Promise.all([
      perm.verClientes
        ? prisma.cliente.count({ where: { ativo: true, ...dateFilter, ...setorFilter } })
        : Promise.resolve(null),
      perm.verPropriedades
        ? prisma.propriedade.count({ where: { ...dateFilter, ...setorFilter } })
        : Promise.resolve(null),
      perm.verProcessos
        ? prisma.processo.count({ where: dateFilter })
        : Promise.resolve(null),
      perm.verDocumentos
        ? prisma.documento.count({ where: dateFilter })
        : Promise.resolve(null),
      perm.verProcessos
        ? prisma.processo.groupBy({ by: ["status"], _count: true, where: dateFilter })
        : Promise.resolve([]),
      perm.verProcessos
        ? prisma.processo.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            where: dateFilter,
            include: { cliente: { select: { nome: true } } },
          })
        : Promise.resolve([]),
      perm.verOrcamentos
        ? prisma.orcamento.findMany({
            where: {
              status: "PENDENTE",
              validadeAte: { not: null, lte: limiteVencimento },
            },
            orderBy: { validadeAte: "asc" },
            take: 5,
            include: { cliente: { select: { nome: true } } },
          })
        : Promise.resolve([]),
    ]);

    return Response.json({
      setor: setor ?? "GEO",
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
