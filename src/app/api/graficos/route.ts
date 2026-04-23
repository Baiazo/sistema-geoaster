import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function mesLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function inicioMesOffset(offset: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - offset, 1);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const agora = new Date();
    const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicio6Meses = inicioMesOffset(5);
    const meses6 = Array.from({ length: 6 }, (_, i) => inicioMesOffset(5 - i));

    // Dashboard por setor
    if (session.setorAtivo === "IMOVEIS") {
      const [
        todosImoveis,
        imoveis6m,
        totalInteressados,
        visitas6m,
      ] = await Promise.all([
        prisma.imovel.findMany({
          select: { status: true, categoria: true, tipo: true, valor: true, cidade: true, corretorId: true, exclusividade: true, createdAt: true },
        }),
        prisma.imovel.findMany({
          where: { createdAt: { gte: inicio6Meses } },
          select: { createdAt: true, status: true, valor: true },
        }),
        prisma.imovelInteressado.count(),
        prisma.visitaImovel.findMany({
          where: { createdAt: { gte: inicio6Meses } },
          select: { createdAt: true },
        }),
      ]);

      // 1. Imóveis por status
      const statusMap: Record<string, number> = {};
      for (const i of todosImoveis) statusMap[i.status] = (statusMap[i.status] || 0) + 1;
      const imoveisPorStatus = Object.entries(statusMap).map(([status, total]) => ({ status, total }));

      // 2. Imóveis por categoria
      const categoriaMap: Record<string, number> = {};
      for (const i of todosImoveis) categoriaMap[i.categoria] = (categoriaMap[i.categoria] || 0) + 1;
      const imoveisPorCategoria = Object.entries(categoriaMap).map(([categoria, total]) => ({ categoria, total }));

      // 3. Imóveis por tipo
      const tipoMap: Record<string, number> = {};
      for (const i of todosImoveis) tipoMap[i.tipo] = (tipoMap[i.tipo] || 0) + 1;
      const imoveisPorTipo = Object.entries(tipoMap)
        .map(([tipo, total]) => ({ tipo, total }))
        .sort((a, b) => b.total - a.total);

      // 4. Imóveis cadastrados vs vendidos por mês
      const imoveisPorMes = meses6.map((inicio, i) => {
        const fim = i < 5 ? meses6[i + 1] : new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
        const label = mesLabel(inicio);
        const cadastrados = imoveis6m.filter((im) => im.createdAt >= inicio && im.createdAt < fim).length;
        const vendidos = imoveis6m.filter((im) => im.status === "VENDIDO" && im.createdAt >= inicio && im.createdAt < fim).length;
        return { mes: label, cadastrados, vendidos };
      });

      // 5. Valor de vendas por mês
      const vendasPorMes = meses6.map((inicio, i) => {
        const fim = i < 5 ? meses6[i + 1] : new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
        const total = imoveis6m
          .filter((im) => im.status === "VENDIDO" && im.createdAt >= inicio && im.createdAt < fim && im.valor)
          .reduce((acc, im) => acc + (im.valor ?? 0), 0);
        return { mes: mesLabel(inicio), total };
      });

      // 6. Top corretores (imóveis captados)
      const corretorIds = todosImoveis.filter((im) => im.corretorId).map((im) => im.corretorId!);
      const corretores = await prisma.usuario.findMany({
        where: { id: { in: [...new Set(corretorIds)] } },
        select: { id: true, nome: true },
      });
      const corretorMap: Record<string, { nome: string; total: number }> = {};
      for (const im of todosImoveis) {
        if (!im.corretorId) continue;
        const c = corretores.find((u) => u.id === im.corretorId);
        if (!corretorMap[im.corretorId]) corretorMap[im.corretorId] = { nome: c?.nome ?? "Desconhecido", total: 0 };
        corretorMap[im.corretorId].total++;
      }
      const topCorretores = Object.values(corretorMap).sort((a, b) => b.total - a.total).slice(0, 10);

      // 7. Imóveis por exclusividade
      const exclusividadeMap: Record<string, number> = {};
      for (const im of todosImoveis) {
        const key = im.exclusividade ? "Exclusivo" : "Não exclusivo";
        exclusividadeMap[key] = (exclusividadeMap[key] || 0) + 1;
      }
      const imoveisPorExclusividade = Object.entries(exclusividadeMap).map(([label, total]) => ({ label, total }));

      // 8. Imóveis por cidade (top 10)
      const cidadeMap: Record<string, number> = {};
      for (const im of todosImoveis) {
        if (im.cidade) cidadeMap[im.cidade] = (cidadeMap[im.cidade] || 0) + 1;
      }
      const imoveisPorCidade = Object.entries(cidadeMap)
        .map(([cidade, total]) => ({ cidade, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // KPIs
      const totalImoveis = todosImoveis.length;
      const totalDisponiveis = todosImoveis.filter((im) => im.status === "DISPONIVEL").length;
      const vendidosMes = todosImoveis.filter((im) => im.status === "VENDIDO" && im.createdAt >= inicioMesAtual).length;
      const valorCarteira = todosImoveis
        .filter((im) => im.status === "DISPONIVEL" && im.valor)
        .reduce((acc, im) => acc + (im.valor ?? 0), 0);
      const visitasMes = visitas6m.filter((v) => v.createdAt >= inicioMesAtual).length;

      return Response.json({
        setor: "IMOVEIS",
        imoveisPorStatus,
        imoveisPorCategoria,
        imoveisPorTipo,
        imoveisPorMes,
        vendasPorMes,
        topCorretores,
        imoveisPorExclusividade,
        imoveisPorCidade,
        kpis: {
          totalImoveis,
          totalDisponiveis,
          vendidosMes,
          valorCarteira,
          visitasMes,
        },
      });
    }

    // Dashboard padrão (GEO / AMBIENTAL / sem setor)
    const [
      todosProcessos,
      processos6m,
      processosConcluidos,
      processosComEquipe,
      processosComProp,
    ] = await Promise.all([
      prisma.processo.findMany({
        select: { status: true, tipoServico: true, valor: true },
      }),
      prisma.processo.findMany({
        where: { dataInicio: { gte: inicio6Meses } },
        select: { dataInicio: true, dataFim: true, status: true, valor: true },
      }),
      prisma.processo.findMany({
        where: { status: "CONCLUIDO", dataFim: { not: null } },
        select: { tipoServico: true, dataInicio: true, dataFim: true },
      }),
      prisma.processo.findMany({
        where: {
          equipeId: { not: null },
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
        },
        select: {
          equipe: { select: { nome: true, responsavel: { select: { nome: true } } } },
        },
      }),
      prisma.processo.findMany({
        where: { propriedadeId: { not: null } },
        select: { propriedade: { select: { municipio: true } } },
      }),
    ]);

    const georreferenciados = await prisma.processo.findMany({
      where: {
        tipoServico: "Georreferenciamento",
        status: "CONCLUIDO",
        dataFim: { not: null, gte: inicio6Meses },
      },
      select: {
        dataFim: true,
        propriedade: { select: { area: true } },
      },
    });

    const statusMap: Record<string, number> = {};
    for (const p of todosProcessos) statusMap[p.status] = (statusMap[p.status] || 0) + 1;
    const processosPorStatus = Object.entries(statusMap).map(([status, total]) => ({ status, total }));

    const tipoMap: Record<string, number> = {};
    for (const p of todosProcessos) tipoMap[p.tipoServico] = (tipoMap[p.tipoServico] || 0) + 1;
    const processosPorTipo = Object.entries(tipoMap)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total);

    const processosAbertosFechadosMes = meses6.map((inicio, i) => {
      const fim = i < 5 ? meses6[i + 1] : new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
      const label = mesLabel(inicio);
      const abertos = processos6m.filter((p) => p.dataInicio >= inicio && p.dataInicio < fim).length;
      const finalizados = processos6m.filter(
        (p) => p.dataFim && p.dataFim >= inicio && p.dataFim < fim && (p.status === "CONCLUIDO" || p.status === "CANCELADO")
      ).length;
      return { mes: label, abertos, finalizados };
    });

    const prazoMap: Record<string, number[]> = {};
    for (const p of processosConcluidos) {
      const dias = Math.round((p.dataFim!.getTime() - p.dataInicio.getTime()) / 86400000);
      if (!prazoMap[p.tipoServico]) prazoMap[p.tipoServico] = [];
      prazoMap[p.tipoServico].push(dias);
    }
    const prazoMedioPorTipo = Object.entries(prazoMap).map(([tipo, dias]) => ({
      tipo,
      mediaDias: Math.round(dias.reduce((a, b) => a + b, 0) / dias.length),
    })).sort((a, b) => b.mediaDias - a.mediaDias);

    const faturamentoMensal = meses6.map((inicio, i) => {
      const fim = i < 5 ? meses6[i + 1] : new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
      const total = processos6m
        .filter((p) => p.dataInicio >= inicio && p.dataInicio < fim && p.valor)
        .reduce((acc, p) => acc + (p.valor ?? 0), 0);
      return { mes: mesLabel(inicio), total };
    });

    const receitaTipoMap: Record<string, number> = {};
    for (const p of todosProcessos) {
      if (p.valor) receitaTipoMap[p.tipoServico] = (receitaTipoMap[p.tipoServico] || 0) + p.valor;
    }
    const receitaPorTipo = Object.entries(receitaTipoMap)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total);

    const areaGeorreferenciada = meses6.map((inicio, i) => {
      const fim = i < 5 ? meses6[i + 1] : new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
      const area = georreferenciados
        .filter((p) => p.dataFim! >= inicio && p.dataFim! < fim)
        .reduce((acc, p) => acc + (p.propriedade?.area ?? 0), 0);
      return { mes: mesLabel(inicio), area: Math.round(area * 100) / 100 };
    });

    const equipeMap: Record<string, { equipe: string; responsavel: string; total: number }> = {};
    for (const p of processosComEquipe) {
      if (!p.equipe) continue;
      const key = p.equipe.nome;
      if (!equipeMap[key]) {
        equipeMap[key] = {
          equipe: p.equipe.nome,
          responsavel: p.equipe.responsavel?.nome ?? "Sem responsável",
          total: 0,
        };
      }
      equipeMap[key].total++;
    }
    const cargaTrabalho = Object.values(equipeMap).sort((a, b) => b.total - a.total);

    const municipioMap: Record<string, number> = {};
    for (const p of processosComProp) {
      const m = p.propriedade?.municipio;
      if (m) municipioMap[m] = (municipioMap[m] || 0) + 1;
    }
    const processosPorMunicipio = Object.entries(municipioMap)
      .map(([municipio, total]) => ({ municipio, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const totalAtivos = todosProcessos.filter((p) => p.status === "PENDENTE" || p.status === "EM_ANDAMENTO").length;

    const concluidosMes = await prisma.processo.count({
      where: { status: "CONCLUIDO", dataFim: { gte: inicioMesAtual } },
    });

    const faturamentoMes = processos6m
      .filter((p) => p.dataInicio >= inicioMesAtual && p.valor)
      .reduce((acc, p) => acc + (p.valor ?? 0), 0);

    const areaMes = georreferenciados
      .filter((p) => p.dataFim! >= inicioMesAtual)
      .reduce((acc, p) => acc + (p.propriedade?.area ?? 0), 0);

    return Response.json({
      setor: "GEO",
      processosPorStatus,
      processosPorTipo,
      processosAbertosFechadosMes,
      prazoMedioPorTipo,
      faturamentoMensal,
      receitaPorTipo,
      areaGeorreferenciada,
      cargaTrabalho,
      processosPorMunicipio,
      kpis: {
        totalAtivos,
        concluidosMes,
        faturamentoMes,
        areaMes: Math.round(areaMes * 100) / 100,
      },
    });
  } catch (error) {
    console.error("[GET /api/graficos]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
