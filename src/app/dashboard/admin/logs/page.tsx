"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogItem {
  id: string;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  descricao: string | null;
  createdAt: string;
  usuario: { id: string; nome: string; email: string } | null;
}

interface ApiResponse {
  logs: LogItem[];
  total: number;
  paginas: number;
  pagina: number;
}

const ACAO_CORES: Record<string, string> = {
  CRIAR: "bg-green-100 text-green-700 border border-green-200",
  EDITAR: "bg-blue-100 text-blue-700 border border-blue-200",
  EXCLUIR: "bg-red-100 text-red-700 border border-red-200",
  LOGIN: "bg-purple-100 text-purple-700 border border-purple-200",
  LOGOUT: "bg-gray-100 text-gray-600 border border-gray-200",
};

const ACAO_LABELS: Record<string, string> = {
  CRIAR: "Criar",
  EDITAR: "Editar",
  EXCLUIR: "Excluir",
  LOGIN: "Login",
  LOGOUT: "Logout",
};

const ACOES = ["CRIAR", "EDITAR", "EXCLUIR", "LOGIN", "LOGOUT"];
const ENTIDADES = [
  "Cliente", "Propriedade", "Processo", "Documento",
  "Colaborador", "Equipe", "Usuário",
];

function formatData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function LogsPage() {
  const [dados, setDados] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [acao, setAcao] = useState("");
  const [entidade, setEntidade] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [pagina, setPagina] = useState(1);

  const buscar = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (acao) params.set("acao", acao);
      if (entidade) params.set("entidade", entidade);
      if (inicio) params.set("inicio", inicio);
      if (fim) params.set("fim", fim);
      params.set("pagina", String(p));

      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) setDados(await res.json());
    } finally {
      setLoading(false);
    }
  }, [q, acao, entidade, inicio, fim]);

  useEffect(() => {
    buscar(pagina);
  }, [buscar, pagina]);

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    setPagina(1);
    buscar(1);
  }

  function limparFiltros() {
    setQ("");
    setAcao("");
    setEntidade("");
    setInicio("");
    setFim("");
    setPagina(1);
  }

  const temFiltro = q || acao || entidade || inicio || fim;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 rounded-lg">
          <ShieldAlert className="h-5 w-5 text-slate-200" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs de Auditoria</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Registro de todas as ações realizadas no sistema</p>
        </div>
      </div>

      {/* Filtros */}
      <form onSubmit={handleBuscar} className="bg-card border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por descrição, entidade ou usuário..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            value={acao}
            onChange={(e) => setAcao(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todas as ações</option>
            {ACOES.map((a) => (
              <option key={a} value={a}>{ACAO_LABELS[a]}</option>
            ))}
          </select>

          <select
            value={entidade}
            onChange={(e) => setEntidade(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todas as entidades</option>
            {ENTIDADES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">De:</label>
            <Input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Até:</label>
            <Input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2 lg:col-start-4">
            <Button type="submit" size="sm" className="flex-1 bg-sky-500 hover:bg-sky-600">
              <Search className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
            {temFiltro && (
              <Button type="button" variant="outline" size="sm" onClick={limparFiltros}>
                Limpar
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Contador */}
      {dados && !loading && (
        <p className="text-sm text-muted-foreground">
          {dados.total === 0
            ? "Nenhum registro encontrado"
            : `${dados.total.toLocaleString("pt-BR")} registro${dados.total !== 1 ? "s" : ""} encontrado${dados.total !== 1 ? "s" : ""}`
          }
        </p>
      )}

      {/* Tabela */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
          </div>
        ) : !dados || dados.logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <ShieldAlert className="h-10 w-10 opacity-20" />
            <p className="text-sm">Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Data / Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ação</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entidade</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dados.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-mono text-xs">
                      {formatData(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {log.usuario ? (
                        <div>
                          <p className="font-medium text-foreground">{log.usuario.nome}</p>
                          <p className="text-xs text-muted-foreground">{log.usuario.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Sistema</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        ACAO_CORES[log.acao] ?? "bg-gray-100 text-gray-600 border border-gray-200"
                      )}>
                        {ACAO_LABELS[log.acao] ?? log.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{log.entidade}</span>
                      {log.entidadeId && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[120px]">
                          {log.entidadeId}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs">
                      {log.descricao || <span className="italic text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {dados && dados.paginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {dados.pagina} de {dados.paginas}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={dados.pagina <= 1 || loading}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagina((p) => Math.min(dados.paginas, p + 1))}
              disabled={dados.pagina >= dados.paginas || loading}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
