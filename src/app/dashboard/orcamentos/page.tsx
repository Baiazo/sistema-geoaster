"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import {
  Plus, Search, Eye, Loader2, FileSignature, Lock, CheckCircle2, XCircle,
} from "lucide-react";
import { usePermissoes } from "@/contexts/permissoes-context";

interface Orcamento {
  id: string;
  protocolo: string;
  clienteId: string;
  propriedadeId?: string;
  tipoServico: string;
  descricao?: string;
  valor?: number;
  condicoesPagamento?: string;
  prazoExecucaoDias?: number;
  validadeAte?: string;
  observacoes?: string;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
  createdAt: string;
  cliente: { id: string; nome: string };
  propriedade?: { id: string; nome: string };
  processo?: { id: string; protocolo: string; status: string };
  criadoPor?: { id: string; nome: string };
}

interface Cliente { id: string; nome: string }
interface Propriedade { id: string; nome: string; clienteId: string }
interface Equipe { id: string; nome: string }

const TIPOS_SERVICO_POR_SETOR: Record<string, string[]> = {
  GEO: [
    "Georreferenciamento",
    "CAR",
    "Regularização ambiental",
    "Licença ambiental",
    "Emissão de CCIR",
    "Processo INCRA",
    "Mapa de uso e ocupação de solo",
    "Inventário florestal",
    "Outros",
  ],
  AMBIENTAL: [
    "Georreferenciamento",
    "CAR",
    "Regularização ambiental",
    "Licença ambiental",
    "Emissão de CCIR",
    "Processo INCRA",
    "Mapa de uso e ocupação de solo",
    "Inventário florestal",
    "Outros",
  ],
  IMOVEIS: [
    "Avaliação de imóvel rural",
    "Avaliação de imóvel urbano",
  ],
};

const emptyForm = {
  clienteId: "",
  propriedadeId: "",
  tipoServico: "",
  descricao: "",
  valor: "",
  condicoesPagamento: "",
  prazoExecucaoDias: "",
  validadeAte: "",
  observacoes: "",
};

function formatarMoeda(valor?: number | null): string {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarInputMoeda(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMoedaInput(formatted: string): number | undefined {
  if (!formatted) return undefined;
  const n = parseFloat(formatted.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? undefined : n;
}

export default function OrcamentosPage() {
  const permissoes = usePermissoes();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [rejeitarOpen, setRejeitarOpen] = useState(false);
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState<Orcamento | null>(null);
  const [equipeAprovacao, setEquipeAprovacao] = useState("");
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [erroMotivo, setErroMotivo] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [setorAtivo, setSetorAtivo] = useState<string>("");

  const tiposServico = setorAtivo && TIPOS_SERVICO_POR_SETOR[setorAtivo]
    ? TIPOS_SERVICO_POR_SETOR[setorAtivo]
    : TIPOS_SERVICO_POR_SETOR["GEO"];

  const fetchOrcamentos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ busca });
      if (filtroStatus !== "todos") params.set("status", filtroStatus);
      const res = await fetch(`/api/orcamentos?${params}`);
      setOrcamentos(await res.json());
    } finally {
      setLoading(false);
    }
  }, [busca, filtroStatus]);

  useEffect(() => {
    const timer = setTimeout(fetchOrcamentos, 300);
    return () => clearTimeout(timer);
  }, [fetchOrcamentos]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
    fetch("/api/equipes")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEquipes(data); })
      .catch(() => {});
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.usuario?.setorAtivo) {
          setSetorAtivo(data.usuario.setorAtivo);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.clienteId) {
      setPropriedades([]);
      fetch(`/api/propriedades?clienteId=${form.clienteId}`)
        .then((r) => r.json())
        .then(setPropriedades);
    } else {
      setPropriedades([]);
    }
  }, [form.clienteId]);

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    if (!form.clienteId) novosErros.clienteId = "Selecione um cliente";
    if (!form.tipoServico) novosErros.tipoServico = "Selecione o tipo de serviço";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          propriedadeId: form.propriedadeId || undefined,
          valor: parseMoedaInput(form.valor),
          prazoExecucaoDias: form.prazoExecucaoDias ? Number(form.prazoExecucaoDias) : undefined,
          validadeAte: form.validadeAte || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`Orçamento criado! Protocolo: ${data.protocolo}`);
      setDialogOpen(false);
      setForm(emptyForm);
      setErros({});
      fetchOrcamentos();
    } finally {
      setSaving(false);
    }
  }

  async function handleAprovar(e: React.FormEvent) {
    e.preventDefault();
    if (!orcamentoSelecionado) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orcamentos/${orcamentoSelecionado.id}/aprovar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipeId: equipeAprovacao || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao aprovar"); return; }
      toast.success(`Orçamento aprovado! Processo ${data.processo.protocolo} criado.`);
      setAprovarOpen(false);
      setEquipeAprovacao("");
      fetchOrcamentos();
    } finally {
      setSaving(false);
    }
  }

  async function handleRejeitar(e: React.FormEvent) {
    e.preventDefault();
    if (!orcamentoSelecionado) return;
    const motivo = motivoRejeicao.trim();
    if (!motivo) {
      setErroMotivo("Informe o motivo da rejeição");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orcamentos/${orcamentoSelecionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJEITADO", motivoRejeicao: motivo }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erro ao rejeitar");
        return;
      }
      toast.success("Orçamento rejeitado");
      setRejeitarOpen(false);
      setMotivoRejeicao("");
      setErroMotivo("");
      fetchOrcamentos();
    } finally {
      setSaving(false);
    }
  }

  function abrirAprovacao(orc: Orcamento) {
    setOrcamentoSelecionado(orc);
    setEquipeAprovacao("");
    setAprovarOpen(true);
  }

  function abrirRejeicao(orc: Orcamento) {
    setOrcamentoSelecionado(orc);
    setMotivoRejeicao("");
    setErroMotivo("");
    setRejeitarOpen(true);
  }

  if (!permissoes.verOrcamentos) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Lock}
          title="Acesso restrito"
          description="Você não tem permissão para visualizar orçamentos. Contate o administrador."
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-muted-foreground mt-1">Propostas comerciais que viram processos ao serem aprovadas</p>
        </div>
        {permissoes.cadastrarOrcamentos && (
          <Button
            onClick={() => { setForm(emptyForm); setErros({}); setDialogOpen(true); }}
            className="bg-sky-500 hover:bg-sky-600"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
          </Button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
          <Input
            placeholder="Buscar por protocolo, serviço ou cliente..."
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar orçamentos"
          />
        </div>
        <Select value={filtroStatus} onValueChange={(v) => v !== null && setFiltroStatus(v)}>
          <SelectTrigger className="w-44" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="APROVADO">Aprovado</SelectItem>
            <SelectItem value="REJEITADO">Rejeitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border shadow-md">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-label="Carregando" />
          </div>
        ) : orcamentos.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title={busca || filtroStatus !== "todos" ? "Nenhum orçamento encontrado" : "Nenhum orçamento cadastrado"}
            description={busca || filtroStatus !== "todos" ? "Tente outros filtros de busca" : "Crie o primeiro orçamento para começar"}
            action={
              !busca && filtroStatus === "todos" && permissoes.cadastrarOrcamentos ? (
                <Button
                  onClick={() => { setForm(emptyForm); setErros({}); setDialogOpen(true); }}
                  className="bg-sky-500 hover:bg-sky-600"
                >
                  <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo de Serviço</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orcamentos.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm font-medium">{o.protocolo}</TableCell>
                  <TableCell>{o.cliente.nome}</TableCell>
                  <TableCell>{o.tipoServico}</TableCell>
                  <TableCell>{formatarMoeda(o.valor)}</TableCell>
                  <TableCell>
                    {o.validadeAte ? new Date(o.validadeAte).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {o.criadoPor?.nome ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/orcamentos/${o.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        aria-label={`Ver detalhes do orçamento ${o.protocolo}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      {permissoes.cadastrarOrcamentos && o.status === "PENDENTE" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirAprovacao(o)}
                            aria-label={`Aprovar orçamento ${o.protocolo}`}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirRejeicao(o)}
                            aria-label={`Rejeitar orçamento ${o.protocolo}`}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                          >
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog: Novo orçamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="orc-cliente">Cliente *</Label>
              <Select
                value={form.clienteId}
                onValueChange={(v) => v !== null && setForm((f) => ({ ...f, clienteId: v, propriedadeId: "" }))}
              >
                <SelectTrigger id="orc-cliente" aria-invalid={!!erros.clienteId}>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {erros.clienteId && <p className="text-sm text-red-500">{erros.clienteId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orc-propriedade">Propriedade (opcional)</Label>
              <Select
                value={form.propriedadeId}
                onValueChange={(v) => v !== null && setForm((f) => ({ ...f, propriedadeId: v }))}
              >
                <SelectTrigger id="orc-propriedade">
                  <SelectValue placeholder={form.clienteId ? "Selecione a propriedade" : "Selecione o cliente primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {propriedades.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orc-tipo">Tipo de Serviço *</Label>
              <Select
                value={form.tipoServico}
                onValueChange={(v) => v !== null && setForm((f) => ({ ...f, tipoServico: v }))}
              >
                <SelectTrigger id="orc-tipo" aria-invalid={!!erros.tipoServico}>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {tiposServico.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {erros.tipoServico && <p className="text-sm text-red-500">{erros.tipoServico}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orc-descricao">Descrição / escopo</Label>
              <Textarea
                id="orc-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={3}
                placeholder="Detalhe o que será entregue no serviço..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="orc-valor">Valor (R$)</Label>
                <Input
                  id="orc-valor"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: formatarInputMoeda(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orc-prazo">Prazo execução (dias)</Label>
                <Input
                  id="orc-prazo"
                  type="number"
                  min="0"
                  placeholder="30"
                  value={form.prazoExecucaoDias}
                  onChange={(e) => setForm((f) => ({ ...f, prazoExecucaoDias: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orc-pagamento">Condições de pagamento</Label>
              <Input
                id="orc-pagamento"
                value={form.condicoesPagamento}
                onChange={(e) => setForm((f) => ({ ...f, condicoesPagamento: e.target.value }))}
                placeholder="Ex.: 50% entrada + 50% na entrega"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orc-validade">Proposta válida até</Label>
              <Input
                id="orc-validade"
                type="date"
                value={form.validadeAte}
                onChange={(e) => setForm((f) => ({ ...f, validadeAte: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orc-obs">Observações</Label>
              <Textarea
                id="orc-obs"
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Criar Orçamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rejeitar orçamento */}
      <Dialog open={rejeitarOpen} onOpenChange={setRejeitarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar orçamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRejeitar} className="space-y-4" noValidate>
            <p className="text-sm text-muted-foreground">
              Orçamento <span className="font-mono font-bold">{orcamentoSelecionado?.protocolo}</span>.
              Informe o motivo da rejeição — ficará registrado no histórico.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="orc-motivo">Motivo da rejeição *</Label>
              <Textarea
                id="orc-motivo"
                value={motivoRejeicao}
                onChange={(e) => {
                  setMotivoRejeicao(e.target.value);
                  if (erroMotivo) setErroMotivo("");
                }}
                rows={4}
                placeholder="Ex.: cliente achou o valor acima do orçado, prazo não atende..."
                aria-invalid={!!erroMotivo}
                className={erroMotivo ? "border-red-500" : ""}
              />
              {erroMotivo && <p className="text-sm text-red-500">{erroMotivo}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejeitarOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <XCircle className="mr-2 h-4 w-4" />}
                Rejeitar orçamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Aprovar orçamento */}
      <Dialog open={aprovarOpen} onOpenChange={setAprovarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar orçamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAprovar} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O orçamento <span className="font-mono font-bold">{orcamentoSelecionado?.protocolo}</span> será
              convertido em processo mantendo o mesmo protocolo.
            </p>
            {equipes.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="orc-equipe">Equipe responsável (opcional)</Label>
                <Select value={equipeAprovacao} onValueChange={(v) => v !== null && setEquipeAprovacao(v)}>
                  <SelectTrigger id="orc-equipe">
                    <SelectValue placeholder="Selecione a equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipes.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAprovarOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Aprovar e criar processo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
