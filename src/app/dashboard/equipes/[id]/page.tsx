"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Loader2, UserCheck, Users, FileText,
  Briefcase, CheckCircle2, Clock, XCircle, Eye,
  Mail, User, Phone,
} from "lucide-react";

interface Colaborador {
  id: string;
  nome: string;
  cargo?: string;
  email?: string;
}

interface Processo {
  id: string;
  protocolo: string;
  tipoServico: string;
  status: string;
  valor?: number;
  dataInicio: string;
  dataFim?: string;
  cliente: { id: string; nome: string };
  propriedade?: { id: string; nome: string; municipio: string };
}

interface Equipe {
  id: string;
  nome: string;
  telefone?: string;
  ativo: boolean;
  responsavel?: Colaborador;
  membros: { colaborador: Colaborador }[];
  processos: Processo[];
}

const STATUS_ORDER = ["EM_ANDAMENTO", "PENDENTE", "CONCLUIDO", "CANCELADO"];

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="px-5 py-4 border-b">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function EquipeDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [equipe, setEquipe] = useState<Equipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/equipes/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          setErro(d.error || "Erro ao carregar equipe");
          return;
        }
        setEquipe(await r.json());
      })
      .catch(() => setErro("Erro ao carregar equipe"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" aria-label="Carregando" />
      </div>
    );
  }

  if (erro || !equipe) {
    return (
      <div className="p-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <p className="text-muted-foreground">{erro || "Equipe não encontrada."}</p>
      </div>
    );
  }

  const todosColaboradores = [
    ...(equipe.responsavel ? [{ colaborador: equipe.responsavel, isResponsavel: true }] : []),
    ...equipe.membros
      .filter((m) => m.colaborador.id !== equipe.responsavel?.id)
      .map((m) => ({ colaborador: m.colaborador, isResponsavel: false })),
  ];

  const processosPorStatus = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = equipe.processos.filter((p) => p.status === s).length;
    return acc;
  }, {});

  const ativos = (processosPorStatus["PENDENTE"] ?? 0) + (processosPorStatus["EM_ANDAMENTO"] ?? 0);
  const concluidos = processosPorStatus["CONCLUIDO"] ?? 0;
  const cancelados = processosPorStatus["CANCELADO"] ?? 0;

  const faturamento = equipe.processos
    .filter((p) => p.valor)
    .reduce((acc, p) => acc + (p.valor ?? 0), 0);

  const municipios = [...new Set(
    equipe.processos
      .map((p) => p.propriedade?.municipio)
      .filter(Boolean)
  )];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/equipes"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para Equipes
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{equipe.nome}</h1>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  equipe.ativo
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}
              >
                {equipe.ativo ? "Ativa" : "Inativa"}
              </span>
            </div>
            {equipe.responsavel && (
              <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-sky-500" aria-hidden="true" />
                Responsável: <span className="font-medium text-foreground">{equipe.responsavel.nome}</span>
                {equipe.responsavel.cargo && (
                  <span className="text-xs">· {equipe.responsavel.cargo}</span>
                )}
              </p>
            )}
            {equipe.telefone && (
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-sm">
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium text-foreground">{equipe.telefone}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Membros" value={todosColaboradores.length} color="bg-sky-500" />
        <StatCard icon={Clock} label="Processos ativos" value={ativos} color="bg-amber-500" />
        <StatCard icon={CheckCircle2} label="Concluídos" value={concluidos} color="bg-green-500" />
        <StatCard
          icon={FileText}
          label="Faturamento total"
          value={faturamento > 0 ? formatCurrency(faturamento) : "—"}
          color="bg-purple-500"
        />
      </div>

      {/* Membros */}
      <Section title={`Membros · ${todosColaboradores.length}`}>
        {todosColaboradores.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-6">Nenhum membro cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todosColaboradores.map(({ colaborador, isResponsavel }) => (
                <TableRow key={colaborador.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                    </div>
                    {colaborador.nome}
                  </TableCell>
                  <TableCell>{colaborador.cargo || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {colaborador.email ? (
                      <a
                        href={`mailto:${colaborador.email}`}
                        className="flex items-center gap-1 text-sky-500 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        {colaborador.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isResponsavel ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400">
                        <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Responsável
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Membro</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Processos */}
      <Section title={`Processos · ${equipe.processos.length}`}>
        {equipe.processos.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 py-6">Nenhum processo vinculado a esta equipe.</p>
        ) : (
          <>
            {/* Distribuição por status */}
            <div className="flex flex-wrap gap-3 px-5 py-3 border-b">
              {[
                { label: "Em andamento", count: processosPorStatus["EM_ANDAMENTO"] ?? 0, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
                { label: "Pendente", count: processosPorStatus["PENDENTE"] ?? 0, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
                { label: "Concluído", count: processosPorStatus["CONCLUIDO"] ?? 0, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
                { label: "Cancelado", count: cancelados, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
              ].map(({ label, count, color }) => (
                <span key={label} className={cn("text-xs px-2.5 py-1 rounded-full font-medium", color)}>
                  {label}: {count}
                </span>
              ))}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo de Serviço</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead className="text-right">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipe.processos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm font-medium">{p.protocolo}</TableCell>
                    <TableCell>{p.cliente.nome}</TableCell>
                    <TableCell>{p.tipoServico}</TableCell>
                    <TableCell>{p.propriedade?.municipio || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {p.valor ? (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(p.valor)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>{new Date(p.dataInicio).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/processos/${p.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        aria-label={`Ver processo ${p.protocolo}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Section>

      {/* Municípios atendidos */}
      {municipios.length > 0 && (
        <Section title="Municípios atendidos">
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {municipios.map((m) => (
              <span
                key={m}
                className="text-sm bg-muted text-muted-foreground px-3 py-1 rounded-full"
              >
                {m}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Distribuição por tipo de serviço */}
      {equipe.processos.length > 0 && (
        <Section title="Distribuição por tipo de serviço">
          <div className="px-5 py-4 space-y-2">
            {Object.entries(
              equipe.processos.reduce<Record<string, number>>((acc, p) => {
                acc[p.tipoServico] = (acc[p.tipoServico] || 0) + 1;
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .map(([tipo, count]) => (
                <div key={tipo} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{tipo}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${(count / equipe.processos.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* Processos com cancelamento */}
      {cancelados > 0 && (
        <Section title={`Processos cancelados · ${cancelados}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo de Serviço</TableHead>
                <TableHead>Data início</TableHead>
                <TableHead className="text-right">Ver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipe.processos
                .filter((p) => p.status === "CANCELADO")
                .map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.protocolo}</TableCell>
                    <TableCell>{p.cliente.nome}</TableCell>
                    <TableCell>{p.tipoServico}</TableCell>
                    <TableCell>{new Date(p.dataInicio).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/processos/${p.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        aria-label={`Ver processo ${p.protocolo}`}
                      >
                        <XCircle className="h-4 w-4 text-red-400" aria-hidden="true" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Section>
      )}
    </div>
  );
}
