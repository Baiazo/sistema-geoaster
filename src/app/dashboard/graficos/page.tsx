"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, TrendingUp, CheckCircle, DollarSign, Ruler, FileDown, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";

interface KPIs {
  totalAtivos: number;
  concluidosMes: number;
  faturamentoMes: number;
  areaMes: number;
}

interface DadosGraficos {
  processosPorStatus: { status: string; total: number }[];
  processosPorTipo: { tipo: string; total: number }[];
  processosAbertosFechadosMes: { mes: string; abertos: number; finalizados: number }[];
  prazoMedioPorTipo: { tipo: string; mediaDias: number }[];
  faturamentoMensal: { mes: string; total: number }[];
  receitaPorTipo: { tipo: string; total: number }[];
  areaGeorreferenciada: { mes: string; area: number }[];
  cargaTrabalho: { equipe: string; responsavel: string; total: number }[];
  processosPorMunicipio: { municipio: string; total: number }[];
  kpis: KPIs;
}

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "#f59e0b",
  EM_ANDAMENTO: "#3b82f6",
  CONCLUIDO: "#22c55e",
  CANCELADO: "#ef4444",
};

const CHART_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function KPICard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-lg border shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-lg border shadow-sm p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
      Sem dados suficientes
    </div>
  );
}

export default function GraficosPage() {
  const [dados, setDados] = useState<DadosGraficos | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingXLS, setExportingXLS] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/graficos")
      .then((r) => r.json())
      .then(setDados)
      .finally(() => setLoading(false));
  }, []);

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
      a.download = "graficos-geoaster.pdf";
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

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([
          { Indicador: "Processos ativos", Valor: dados.kpis.totalAtivos },
          { Indicador: "Concluídos no mês", Valor: dados.kpis.concluidosMes },
          { Indicador: "Faturamento do mês (R$)", Valor: dados.kpis.faturamentoMes },
          { Indicador: "Área georref. no mês (ha)", Valor: dados.kpis.areaMes },
        ]),
        "KPIs"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          dados.processosPorStatus.map((d) => ({ Status: STATUS_LABELS[d.status] ?? d.status, Total: d.total }))
        ),
        "Por Status"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          dados.processosPorTipo.map((d) => ({ "Tipo de Serviço": d.tipo, Total: d.total }))
        ),
        "Por Tipo"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          dados.processosAbertosFechadosMes.map((d) => ({ Mês: d.mes, Abertos: d.abertos, Finalizados: d.finalizados }))
        ),
        "Abertos vs Finalizados"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          dados.prazoMedioPorTipo.map((d) => ({ "Tipo de Serviço": d.tipo, "Prazo Médio (dias)": d.mediaDias }))
        ),
        "Prazo Médio"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          dados.faturamentoMensal.map((d) => ({ Mês: d.mes, "Faturamento (R$)": d.total }))
        ),
        "Faturamento Mensal"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          dados.receitaPorTipo.map((d) => ({ "Tipo de Serviço": d.tipo, "Receita (R$)": d.total }))
        ),
        "Receita por Tipo"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          dados.areaGeorreferenciada.map((d) => ({ Mês: d.mes, "Área (ha)": d.area }))
        ),
        "Área Georref."
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          dados.cargaTrabalho.map((d) => ({ Equipe: d.equipe, Responsável: d.responsavel, "Processos Ativos": d.total }))
        ),
        "Carga de Trabalho"
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          dados.processosPorMunicipio.map((d) => ({ Município: d.municipio, Total: d.total }))
        ),
        "Por Município"
      );

      XLSX.writeFile(wb, "graficos-geoaster.xlsx");
    } finally {
      setExportingXLS(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" aria-label="Carregando" />
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Erro ao carregar dados.</p>
      </div>
    );
  }

  const { kpis } = dados;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gráficos</h1>
          <p className="text-muted-foreground mt-1">Visão analítica dos dados do sistema</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exportingXLS || exportingPDF}
            aria-label="Exportar Excel"
          >
            {exportingXLS ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sheet className="mr-2 h-4 w-4" />
            )}
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exportingPDF || exportingXLS}
            aria-label="Exportar PDF"
          >
            {exportingPDF ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* Conteúdo capturado para exportação */}
      <div ref={contentRef} className="space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            icon={TrendingUp}
            label="Processos ativos"
            value={String(kpis.totalAtivos)}
            color="bg-sky-500"
          />
          <KPICard
            icon={CheckCircle}
            label="Concluídos no mês"
            value={String(kpis.concluidosMes)}
            color="bg-green-500"
          />
          <KPICard
            icon={DollarSign}
            label="Faturamento do mês"
            value={kpis.faturamentoMes > 0 ? formatCurrency(kpis.faturamentoMes) : "—"}
            color="bg-amber-500"
          />
          <KPICard
            icon={Ruler}
            label="Área georref. no mês (ha)"
            value={kpis.areaMes > 0 ? `${kpis.areaMes.toLocaleString("pt-BR")} ha` : "—"}
            color="bg-purple-500"
          />
        </div>

        {/* Operacional — linha 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Processos por Status">
            {dados.processosPorStatus.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={dados.processosPorStatus.map((d) => ({
                      name: STATUS_LABELS[d.status] ?? d.status,
                      value: d.total,
                      fill: STATUS_COLORS[d.status] ?? "#94a3b8",
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dados.processosPorStatus.map((d, i) => (
                      <Cell key={i} fill={STATUS_COLORS[d.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, "Processos"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Processos por Tipo de Serviço">
            {dados.processosPorTipo.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dados.processosPorTipo} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="tipo" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" name="Processos" radius={[0, 4, 4, 0]}>
                    {dados.processosPorTipo.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Operacional — linha 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Processos Abertos vs. Finalizados por Mês">
            {dados.processosAbertosFechadosMes.every((d) => d.abertos === 0 && d.finalizados === 0) ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dados.processosAbertosFechadosMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="abertos" name="Abertos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="finalizados" name="Finalizados" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Prazo Médio de Conclusão por Tipo (dias)">
            {dados.prazoMedioPorTipo.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dados.prazoMedioPorTipo} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="tipo" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} dias`, "Média"]} />
                  <Bar dataKey="mediaDias" name="Dias" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Financeiro */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Faturamento Mensal (R$)">
            {dados.faturamentoMensal.every((d) => d.total === 0) ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dados.faturamentoMensal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Faturamento"]} />
                  <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Receita por Tipo de Serviço (R$)">
            {dados.receitaPorTipo.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dados.receitaPorTipo} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="tipo" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Receita"]} />
                  <Bar dataKey="total" name="Receita" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Técnico */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Área Georreferenciada por Mês (ha)">
            {dados.areaGeorreferenciada.every((d) => d.area === 0) ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dados.areaGeorreferenciada}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} ha`, "Área"]} />
                  <Bar dataKey="area" name="Área (ha)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Carga de Trabalho por Equipe (processos ativos)">
            {dados.cargaTrabalho.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dados.cargaTrabalho} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="equipe" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [v, "Processos ativos"]}
                    labelFormatter={(label) => {
                      const item = dados.cargaTrabalho.find((d) => d.equipe === label);
                      return `${label}${item?.responsavel ? ` · ${item.responsavel}` : ""}`;
                    }}
                  />
                  <Bar dataKey="total" name="Processos" fill="#ec4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Municípios */}
        <ChartCard title="Processos por Município (top 10)">
          {dados.processosPorMunicipio.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dados.processosPorMunicipio}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="municipio" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" name="Processos" radius={[4, 4, 0, 0]}>
                  {dados.processosPorMunicipio.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
