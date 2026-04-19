"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Users, MapPin, FileText, FolderOpen, BarChart2, Clock, Loader2, FileDown, Sheet } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

const PERIODOS = [
  { key: "all", label: "Todo o período" },
  { key: "year", label: "1 ano" },
  { key: "month", label: "1 mês" },
  { key: "week", label: "Semana" },
  { key: "today", label: "Hoje" },
];

const STATUS_MAP: Record<string, string> = {
  PENDENTE: "Pendentes",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluídos",
  CANCELADO: "Cancelados",
};

interface DashboardData {
  totalClientes: number;
  totalPropriedades: number;
  totalProcessos: number;
  totalDocumentos: number;
  processosPorStatus: { status: string; _count: number }[];
  processosRecentes: {
    id: string;
    protocolo: string;
    status: string;
    tipoServico: string;
    cliente: { nome: string };
  }[];
}

// Tooltip customizado para o gráfico de barras
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: { name: string; color: string } }[] }) {
  if (!active || !payload?.length) return null;
  const { value, payload: { name, color } } = payload[0];
  return (
    <div className="bg-background border rounded-lg shadow-lg px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-muted-foreground">{name}</span>
        <span className="font-bold ml-1">{value}</span>
      </div>
    </div>
  );
}

export function DashboardClient({ nomeUsuario }: { nomeUsuario: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const barColor = isDark ? "#60a5fa" : "#3b82f6";
  const [periodo, setPeriodo] = useState("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingXLS, setExportingXLS] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  // Animação do indicador do filtro de período
  useEffect(() => {
    const idx = PERIODOS.findIndex((p) => p.key === periodo);
    const btn = buttonRefs.current[idx];
    const container = tabsRef.current;
    if (btn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setIndicatorStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      });
    }
  }, [periodo]);

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?periodo=${p}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(periodo); }, [periodo, fetchData]);

  const chartData = (data?.processosPorStatus ?? []).map((p) => ({
    name: STATUS_MAP[p.status] ?? p.status,
    total: p._count,
  }));

  async function handleExportPDF() {
    if (!contentRef.current || !data) return;
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
      a.download = "dashboard-geoaster.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPDF(false);
    }
  }

  async function handleExportExcel() {
    if (!data) return;
    setExportingXLS(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([
          { Indicador: "Clientes", Valor: data.totalClientes },
          { Indicador: "Propriedades", Valor: data.totalPropriedades },
          { Indicador: "Processos", Valor: data.totalProcessos },
          { Indicador: "Documentos", Valor: data.totalDocumentos },
        ]),
        "Resumo"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          (data.processosPorStatus ?? []).map((p) => ({
            Status: STATUS_MAP[p.status] ?? p.status,
            Total: p._count,
          }))
        ),
        "Por Status"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          (data.processosRecentes ?? []).map((p) => ({
            Protocolo: p.protocolo,
            Cliente: p.cliente.nome,
            "Tipo de Serviço": p.tipoServico,
            Status: STATUS_MAP[p.status] ?? p.status,
          }))
        ),
        "Processos Recentes"
      );

      XLSX.writeFile(wb, "dashboard-geoaster.xlsx");
    } finally {
      setExportingXLS(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá, {nomeUsuario}</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exportingXLS || exportingPDF || loading}
            aria-label="Exportar Excel"
          >
            {exportingXLS ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sheet className="mr-2 h-4 w-4" />}
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exportingPDF || exportingXLS || loading}
            aria-label="Exportar PDF"
          >
            {exportingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Conteúdo capturado para exportação */}
      <div ref={contentRef}>

      {/* Filtro de período com indicador animado */}
      <div
        ref={tabsRef}
        className="relative flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit"
      >
        {/* Indicador deslizante */}
        <span
          className="absolute top-1 bottom-1 bg-background rounded-md shadow-sm transition-all duration-200 ease-out pointer-events-none"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
        {PERIODOS.map((p, i) => (
          <button
            key={p.key}
            ref={(el) => { buttonRefs.current[i] = el; }}
            onClick={() => setPeriodo(p.key)}
            className={`relative z-10 px-3 py-1.5 text-sm rounded-md font-medium transition-colors duration-150 ${
              periodo === p.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Clientes", value: data?.totalClientes, icon: Users },
          { label: "Propriedades", value: data?.totalPropriedades, icon: MapPin },
          { label: "Processos", value: data?.totalProcessos, icon: FileText },
          { label: "Documentos", value: data?.totalDocumentos, icon: FolderOpen },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold">{value ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4" /> Processos por status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="flex items-center justify-center h-52">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
                Nenhum processo no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={chartData} barCategoryGap="35%" margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "#1e293b" : "#f1f5f9", radius: 6 }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={56} fill={barColor}>
                    <LabelList dataKey="total" position="insideTop" style={{ fill: "#fff", fontSize: 13, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Processos */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" /> Processos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-52">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (data?.processosRecentes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum processo no período</p>
            ) : (
              (data?.processosRecentes ?? []).map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{p.protocolo}</p>
                    <p className="text-xs text-muted-foreground">{p.cliente.nome} · {p.tipoServico}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      </div>{/* fim contentRef */}
    </div>
  );
}
