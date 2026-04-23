"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, FileDown, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  GraficosGeo, GraficosImoveis,
  type DadosGraficos, type DadosGraficosGeo, type DadosGraficosImoveis,
} from "@/components/graficos-dashboard";

const SETOR_OPTIONS = [
  { value: "GEO", label: "GeoAster Geo" },
  { value: "AMBIENTAL", label: "GeoAster Ambiental" },
  { value: "IMOVEIS", label: "Baster Imóveis" },
];

export default function GestaoGraficosPage() {
  const searchParams = useSearchParams();
  const setorInicial = searchParams.get("setor") ?? "GEO";

  const [setor, setSetor] = useState(setorInicial);
  const [dados, setDados] = useState<DadosGraficos | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingXLS, setExportingXLS] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/graficos?setor=${encodeURIComponent(setor)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          console.error("[GestaoGraficos]", d.error);
          setDados(null);
        } else {
          setDados(d);
        }
      })
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [setor]);

  async function handleExportPDF() {
    if (!contentRef.current || !dados) return;
    setExportingPDF(true);
    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");
      const imgData = await toPng(contentRef.current, { quality: 1, pixelRatio: 2, backgroundColor: "#ffffff" });
      const naturalSize = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = imgData;
      });
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (naturalSize.h * pdfWidth) / naturalSize.w;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = dados.setor === "IMOVEIS" ? "graficos-baster-imoveis.pdf" : "graficos-geoaster.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPDF(false);
    }
  }

  async function handleExportExcel() {
    if (!dados) return;
    setExportingXLS(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      if (dados.setor === "IMOVEIS") {
        const d = dados as DadosGraficosImoveis;
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet([
            { Indicador: "Total de imóveis", Valor: d.kpis.totalImoveis },
            { Indicador: "Disponíveis", Valor: d.kpis.totalDisponiveis },
            { Indicador: "Vendidos no mês", Valor: d.kpis.vendidosMes },
            { Indicador: "Valor em carteira (R$)", Valor: d.kpis.valorCarteira },
            { Indicador: "Visitas no mês", Valor: d.kpis.visitasMes },
          ]),
          "KPIs"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.imoveisPorStatus.map((d) => ({ Status: d.status === "DISPONIVEL" ? "Disponível" : "Vendido", Total: d.total }))),
          "Por Status"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.imoveisPorCategoria.map((d) => ({ Categoria: d.categoria === "URBANO" ? "Urbano" : "Rural", Total: d.total }))),
          "Por Categoria"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.imoveisPorTipo.map((d) => ({ Tipo: d.tipo, Total: d.total }))),
          "Por Tipo"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.imoveisPorMes.map((d) => ({ Mês: d.mes, Cadastrados: d.cadastrados, Vendidos: d.vendidos }))),
          "Cadastrados vs Vendidos"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.vendasPorMes.map((d) => ({ Mês: d.mes, "Vendas (R$)": d.total }))),
          "Vendas Mensais"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.topCorretores.map((d) => ({ Corretor: d.nome, "Imóveis captados": d.total }))),
          "Top Corretores"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.imoveisPorCidade.map((d) => ({ Cidade: d.cidade, Total: d.total }))),
          "Por Cidade"
        );
        XLSX.writeFile(wb, "graficos-baster-imoveis.xlsx");
      } else {
        const d = dados as DadosGraficosGeo;
        const STATUS_LABELS: Record<string, string> = {
          PENDENTE: "Pendente",
          EM_ANDAMENTO: "Em andamento",
          CONCLUIDO: "Concluído",
          CANCELADO: "Cancelado",
        };
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet([
            { Indicador: "Processos ativos", Valor: d.kpis.totalAtivos },
            { Indicador: "Concluídos no mês", Valor: d.kpis.concluidosMes },
            { Indicador: "Faturamento do mês (R$)", Valor: d.kpis.faturamentoMes },
            { Indicador: "Área georref. no mês (ha)", Valor: d.kpis.areaMes },
          ]),
          "KPIs"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.processosPorStatus.map((d) => ({ Status: STATUS_LABELS[d.status] ?? d.status, Total: d.total }))),
          "Por Status"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.processosPorTipo.map((d) => ({ "Tipo de Serviço": d.tipo, Total: d.total }))),
          "Por Tipo"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.processosAbertosFechadosMes.map((d) => ({ Mês: d.mes, Abertos: d.abertos, Finalizados: d.finalizados }))),
          "Abertos vs Finalizados"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.prazoMedioPorTipo.map((d) => ({ "Tipo de Serviço": d.tipo, "Prazo Médio (dias)": d.mediaDias }))),
          "Prazo Médio"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.faturamentoMensal.map((d) => ({ Mês: d.mes, "Faturamento (R$)": d.total }))),
          "Faturamento Mensal"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.receitaPorTipo.map((d) => ({ "Tipo de Serviço": d.tipo, "Receita (R$)": d.total }))),
          "Receita por Tipo"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.areaGeorreferenciada.map((d) => ({ Mês: d.mes, "Área (ha)": d.area }))),
          "Área Georref."
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.cargaTrabalho.map((d) => ({ Equipe: d.equipe, Responsável: d.responsavel, "Processos Ativos": d.total }))),
          "Carga de Trabalho"
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(d.processosPorMunicipio.map((d) => ({ Município: d.municipio, Total: d.total }))),
          "Por Município"
        );
        XLSX.writeFile(wb, "graficos-geoaster.xlsx");
      }
    } finally {
      setExportingXLS(false);
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gráficos</h1>
          <p className="text-muted-foreground mt-1">
            Dashboard analítico por setor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={setor} onValueChange={(v) => v && setSetor(v)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SETOR_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exportingXLS || exportingPDF || loading} aria-label="Exportar Excel">
            {exportingXLS ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sheet className="mr-2 h-4 w-4" />}
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exportingPDF || exportingXLS || loading} aria-label="Exportar PDF">
            {exportingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-full min-h-96">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" aria-label="Carregando" />
        </div>
      ) : !dados ? (
        <div className="p-8">
          <p className="text-muted-foreground">Erro ao carregar dados.</p>
        </div>
      ) : (
        <div ref={contentRef} className="space-y-8">
          {dados.setor === "IMOVEIS" ? (
            <GraficosImoveis dados={dados as DadosGraficosImoveis} />
          ) : (
            <GraficosGeo dados={dados as DadosGraficosGeo} />
          )}
        </div>
      )}
    </div>
  );
}
