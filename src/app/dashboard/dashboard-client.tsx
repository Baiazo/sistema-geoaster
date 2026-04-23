"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { MensagemDoDiaCard, EditarMensagemDoDiaDialog } from "@/components/mensagem-do-dia";
import Link from "next/link";
import { Users, MapPin, FileText, FolderOpen, BarChart2, Clock, Loader2, FileDown, Sheet, Sparkles, AlertTriangle, Building2, Home, KeyRound, Eye } from "lucide-react";
import { usePermissoes } from "@/contexts/permissoes-context";
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

interface MensagemDoDia {
  id: string;
  conteudo: string;
  ativa: boolean;
  updatedAt: string;
}

interface DashboardDataGeo {
  setor: "GEO";
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
  orcamentosVencendo: {
    id: string;
    protocolo: string;
    tipoServico: string;
    validadeAte: string | null;
    valor: number | null;
    cliente: { nome: string };
  }[];
}

interface DashboardDataImoveis {
  setor: "IMOVEIS";
  totalImoveis: number;
  totalDisponiveis: number;
  totalVendidos: number;
  totalExclusivos: number;
  imoveisPorStatus: { status: string; _count: number }[];
  imoveisRecentes: {
    id: string;
    tipo: string;
    status: string;
    localizacao: string | null;
    cliente: { nome: string };
    corretor: { nome: string } | null;
  }[];
  totalInteressados: number;
  totalVisitas: number;
}

type DashboardData = DashboardDataGeo | DashboardDataImoveis;

function diasAteVencimento(validade: string | null): number | null {
  if (!validade) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(validade);
  vencimento.setHours(0, 0, 0, 0);
  return Math.round((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
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

export function DashboardClient({ nomeUsuario, isAdmin, setorAtivo }: { nomeUsuario: string; isAdmin: boolean; setorAtivo: string | null }) {
  const { theme } = useTheme();
  const permissoes = usePermissoes();
  const isDark = theme === "dark";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const barColor = isDark ? "#60a5fa" : "#3b82f6";
  const [periodo, setPeriodo] = useState("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingXLS, setExportingXLS] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemDoDia | null>(null);
  const [editandoMensagem, setEditandoMensagem] = useState(false);
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

  useEffect(() => {
    let cancelado = false;
    fetch("/api/mensagem-do-dia")
      .then((r) => r.json())
      .then((d) => { if (!cancelado) setMensagem(d.mensagem ?? null); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, []);

  const chartData = data && "processosPorStatus" in data
    ? (data.processosPorStatus ?? []).map((p) => ({
        name: STATUS_MAP[p.status] ?? p.status,
        total: p._count,
      }))
    : [];

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

      if (data.setor === "IMOVEIS") {
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet([
            { Indicador: "Imóveis", Valor: data.totalImoveis },
            { Indicador: "Disponíveis", Valor: data.totalDisponiveis },
            { Indicador: "Vendidos", Valor: data.totalVendidos },
            { Indicador: "Exclusivos", Valor: data.totalExclusivos },
            { Indicador: "Interessados", Valor: data.totalInteressados },
            { Indicador: "Visitas", Valor: data.totalVisitas },
          ]),
          "Resumo"
        );

        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(
            (data.imoveisPorStatus ?? []).map((i) => ({
              Status: i.status === "DISPONIVEL" ? "Disponível" : "Vendido",
              Total: i._count,
            }))
          ),
          "Por Status"
        );

        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(
            (data.imoveisRecentes ?? []).map((i) => ({
              Tipo: i.tipo,
              Cliente: i.cliente.nome,
              Corretor: i.corretor?.nome ?? "-",
              Status: i.status === "DISPONIVEL" ? "Disponível" : "Vendido",
            }))
          ),
          "Imóveis Recentes"
        );

        XLSX.writeFile(wb, "dashboard-baster-imoveis.xlsx");
      } else {
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet([
            { Indicador: "Clientes", Valor: (data as DashboardDataGeo).totalClientes },
            { Indicador: "Propriedades", Valor: (data as DashboardDataGeo).totalPropriedades },
            { Indicador: "Processos", Valor: (data as DashboardDataGeo).totalProcessos },
            { Indicador: "Documentos", Valor: (data as DashboardDataGeo).totalDocumentos },
          ]),
          "Resumo"
        );

        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(
            ((data as DashboardDataGeo).processosPorStatus ?? []).map((p) => ({
              Status: STATUS_MAP[p.status] ?? p.status,
              Total: p._count,
            }))
          ),
          "Por Status"
        );

        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(
            ((data as DashboardDataGeo).processosRecentes ?? []).map((p) => ({
              Protocolo: p.protocolo,
              Cliente: p.cliente.nome,
              "Tipo de Serviço": p.tipoServico,
              Status: STATUS_MAP[p.status] ?? p.status,
            }))
          ),
          "Processos Recentes"
        );

        XLSX.writeFile(wb, "dashboard-geoaster.xlsx");
      }
    } finally {
      setExportingXLS(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá, {nomeUsuario}</h1>
          <p className="text-muted-foreground mt-1">
            {setorAtivo === "IMOVEIS" ? "Visão geral da carteira de imóveis" : "Visão geral do sistema"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 justify-end">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditandoMensagem(true)}
              aria-label="Editar mensagem do dia"
            >
              <Sparkles className="mr-2 h-4 w-4 text-sky-600 dark:text-sky-300" />
              Editar mensagem do dia
            </Button>
          )}
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

      {mensagem && <MensagemDoDiaCard conteudo={mensagem.conteudo} />}

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
      {setorAtivo === "IMOVEIS" && data && data.setor === "IMOVEIS" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Imóveis", value: data.totalImoveis, icon: Building2 },
            { label: "Disponíveis", value: data.totalDisponiveis, icon: Home },
            { label: "Vendidos", value: data.totalVendidos, icon: KeyRound },
            { label: "Exclusivos", value: data.totalExclusivos, icon: Sparkles },
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
      ) : (
        [
          { label: "Clientes", value: (data as DashboardDataGeo)?.totalClientes, icon: Users, visivel: permissoes.verClientes },
          { label: "Propriedades", value: (data as DashboardDataGeo)?.totalPropriedades, icon: MapPin, visivel: permissoes.verPropriedades },
          { label: "Processos", value: (data as DashboardDataGeo)?.totalProcessos, icon: FileText, visivel: permissoes.verProcessos },
          { label: "Documentos", value: (data as DashboardDataGeo)?.totalDocumentos, icon: FolderOpen, visivel: permissoes.verDocumentos },
        ].some((c) => c.visivel) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Clientes", value: (data as DashboardDataGeo)?.totalClientes, icon: Users, visivel: permissoes.verClientes },
              { label: "Propriedades", value: (data as DashboardDataGeo)?.totalPropriedades, icon: MapPin, visivel: permissoes.verPropriedades },
              { label: "Processos", value: (data as DashboardDataGeo)?.totalProcessos, icon: FileText, visivel: permissoes.verProcessos },
              { label: "Documentos", value: (data as DashboardDataGeo)?.totalDocumentos, icon: FolderOpen, visivel: permissoes.verDocumentos },
            ].filter((c) => c.visivel).map(({ label, value, icon: Icon }) => (
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
        )
      )}

      {setorAtivo === "IMOVEIS" && data && data.setor === "IMOVEIS" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de imóveis por status */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart2 className="h-4 w-4" /> Imóveis por status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="flex items-center justify-center h-52">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (data.imoveisPorStatus ?? []).length === 0 ? (
                <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
                  Nenhum imóvel no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={(data.imoveisPorStatus ?? []).map((i) => ({
                      name: i.status === "DISPONIVEL" ? "Disponíveis" : "Vendidos",
                      total: i._count,
                    }))}
                    barCategoryGap="35%"
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "#1e293b" : "#f1f5f9", radius: 6 }} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={56} fill={barColor}>
                      <LabelList dataKey="total" position="insideTop" style={{ fill: "#fff", fontSize: 13, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Imóveis recentes */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" /> Imóveis recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-52">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (data.imoveisRecentes ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum imóvel no período</p>
              ) : (
                (data.imoveisRecentes ?? []).map((i) => (
                  <Link key={i.id} href={`/dashboard/imoveis/${i.id}`} className="flex items-start justify-between gap-2 rounded-md px-2 py-2 -mx-2 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{i.tipo}</p>
                      <p className="text-xs text-muted-foreground">{i.cliente.nome}{i.corretor ? ` · ${i.corretor.nome}` : ""}</p>
                    </div>
                    <StatusBadge status={i.status} />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        permissoes.verProcessos && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              ) : ((data as DashboardDataGeo)?.processosRecentes ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum processo no período</p>
              ) : (
                ((data as DashboardDataGeo)?.processosRecentes ?? []).map((p) => (
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
      )}

      {/* Orçamentos próximos do vencimento — só GEO/AMBIENTAL */}
      {setorAtivo !== "IMOVEIS" && permissoes.verOrcamentos && (data as DashboardDataGeo)?.orcamentosVencendo && ((data as DashboardDataGeo).orcamentosVencendo ?? []).length > 0 && (
        <Card className="shadow-sm mt-6 border-amber-200 dark:border-amber-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Orçamentos próximos do vencimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {((data as DashboardDataGeo)?.orcamentosVencendo ?? []).map((o) => {
              const dias = diasAteVencimento(o.validadeAte);
              const vencido = dias !== null && dias < 0;
              const hoje = dias === 0;
              const label = vencido
                ? `Vencido há ${Math.abs(dias!)} dia(s)`
                : hoje
                ? "Vence hoje"
                : `Vence em ${dias} dia(s)`;
              return (
                <Link
                  key={o.id}
                  href={`/dashboard/orcamentos/${o.id}`}
                  className="flex items-start justify-between gap-2 rounded-md px-2 py-2 -mx-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium font-mono">{o.protocolo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.cliente.nome} · {o.tipoServico}
                    </p>
                  </div>
                  <span
                    className={
                      vencido
                        ? "shrink-0 text-xs px-2 py-1 rounded-full font-medium bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : hoje
                        ? "shrink-0 text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                        : "shrink-0 text-xs px-2 py-1 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      </div>{/* fim contentRef */}

      {isAdmin && (
        <EditarMensagemDoDiaDialog
          open={editandoMensagem}
          onOpenChange={setEditandoMensagem}
          mensagemAtual={mensagem}
          onSaved={setMensagem}
        />
      )}
    </div>
  );
}
