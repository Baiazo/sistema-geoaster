"use client";

import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import {
  TrendingUp, CheckCircle, DollarSign, Ruler,
  Building2, Home, KeyRound,
} from "lucide-react";

// ============ TIPOS ============

export interface KPIsGeo {
  totalAtivos: number;
  concluidosMes: number;
  faturamentoMes: number;
  areaMes: number;
}

export interface DadosGraficosGeo {
  setor: "GEO";
  processosPorStatus: { status: string; total: number }[];
  processosPorTipo: { tipo: string; total: number }[];
  processosAbertosFechadosMes: { mes: string; abertos: number; finalizados: number }[];
  prazoMedioPorTipo: { tipo: string; mediaDias: number }[];
  faturamentoMensal: { mes: string; total: number }[];
  receitaPorTipo: { tipo: string; total: number }[];
  areaGeorreferenciada: { mes: string; area: number }[];
  cargaTrabalho: { equipe: string; responsavel: string; total: number }[];
  processosPorMunicipio: { municipio: string; total: number }[];
  kpis: KPIsGeo;
}

export interface KPIsImoveis {
  totalImoveis: number;
  totalDisponiveis: number;
  vendidosMes: number;
  valorCarteira: number;
  visitasMes: number;
}

export interface DadosGraficosImoveis {
  setor: "IMOVEIS";
  imoveisPorStatus: { status: string; total: number }[];
  imoveisPorCategoria: { categoria: string; total: number }[];
  imoveisPorTipo: { tipo: string; total: number }[];
  imoveisPorMes: { mes: string; cadastrados: number; vendidos: number }[];
  vendasPorMes: { mes: string; total: number }[];
  topCorretores: { nome: string; total: number }[];
  imoveisPorExclusividade: { label: string; total: number }[];
  imoveisPorCidade: { cidade: string; total: number }[];
  kpis: KPIsImoveis;
}

export type DadosGraficos = DadosGraficosGeo | DadosGraficosImoveis;

// ============ CONSTANTS / HELPERS ============

export const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "#f59e0b",
  EM_ANDAMENTO: "#3b82f6",
  CONCLUIDO: "#22c55e",
  CANCELADO: "#ef4444",
};

export const CHART_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

// ============ COMPONENTES BASE ============

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

// ============ GEO / AMBIENTAL ============

export function GraficosGeo({ dados }: { dados: DadosGraficosGeo }) {
  const { kpis } = dados;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard icon={TrendingUp} label="Processos ativos" value={String(kpis.totalAtivos)} color="bg-sky-500" />
        <KPICard icon={CheckCircle} label="Concluídos no mês" value={String(kpis.concluidosMes)} color="bg-green-500" />
        <KPICard icon={DollarSign} label="Faturamento do mês" value={kpis.faturamentoMes > 0 ? formatCurrency(kpis.faturamentoMes) : "—"} color="bg-amber-500" />
        <KPICard icon={Ruler} label="Área georref. no mês (ha)" value={kpis.areaMes > 0 ? `${kpis.areaMes.toLocaleString("pt-BR")} ha` : "—"} color="bg-purple-500" />
      </div>

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
                  cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value"
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
                <Tooltip formatter={(v) => [v, "Processos ativos"]} labelFormatter={(label) => {
                  const item = dados.cargaTrabalho.find((d) => d.equipe === label);
                  return `${label}${item?.responsavel ? ` · ${item.responsavel}` : ""}`;
                }} />
                <Bar dataKey="total" name="Processos" fill="#ec4899" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

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
    </>
  );
}

// ============ IMOVEIS ============

export function GraficosImoveis({ dados }: { dados: DadosGraficosImoveis }) {
  const { kpis } = dados;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard icon={Building2} label="Total de imóveis" value={String(kpis.totalImoveis)} color="bg-yellow-500" />
        <KPICard icon={Home} label="Disponíveis" value={String(kpis.totalDisponiveis)} color="bg-sky-500" />
        <KPICard icon={KeyRound} label="Vendidos no mês" value={String(kpis.vendidosMes)} color="bg-green-500" />
        <KPICard icon={DollarSign} label="Valor em carteira" value={kpis.valorCarteira > 0 ? formatCurrency(kpis.valorCarteira) : "—"} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Imóveis por Status">
          {dados.imoveisPorStatus.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={dados.imoveisPorStatus.map((d) => ({
                    name: d.status === "DISPONIVEL" ? "Disponíveis" : "Vendidos",
                    value: d.total,
                  }))}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value"
                >
                  {dados.imoveisPorStatus.map((d, i) => (
                    <Cell key={i} fill={d.status === "DISPONIVEL" ? "#3b82f6" : "#22c55e"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, "Imóveis"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Imóveis por Categoria">
          {dados.imoveisPorCategoria.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={dados.imoveisPorCategoria.map((d) => ({
                    name: d.categoria === "URBANO" ? "Urbano" : "Rural",
                    value: d.total,
                  }))}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value"
                >
                  {dados.imoveisPorCategoria.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, "Imóveis"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Imóveis por Tipo">
          {dados.imoveisPorTipo.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dados.imoveisPorTipo} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="tipo" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" name="Imóveis" radius={[0, 4, 4, 0]}>
                  {dados.imoveisPorTipo.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Cadastrados vs. Vendidos por Mês">
          {dados.imoveisPorMes.every((d) => d.cadastrados === 0 && d.vendidos === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dados.imoveisPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cadastrados" name="Cadastrados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vendidos" name="Vendidos" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Vendas por Mês (R$)">
          {dados.vendasPorMes.every((d) => d.total === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dados.vendasPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Vendas"]} />
                <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top Corretores (imóveis captados)">
          {dados.topCorretores.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dados.topCorretores} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" name="Imóveis" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Exclusividade">
          {dados.imoveisPorExclusividade.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={dados.imoveisPorExclusividade.map((d) => ({
                    name: d.label,
                    value: d.total,
                  }))}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value"
                >
                  {dados.imoveisPorExclusividade.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, "Imóveis"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Imóveis por Cidade (top 10)">
          {dados.imoveisPorCidade.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dados.imoveisPorCidade} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="cidade" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" name="Imóveis" radius={[0, 4, 4, 0]}>
                  {dados.imoveisPorCidade.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </>
  );
}
