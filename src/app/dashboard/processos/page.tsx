"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
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
import { Plus, Search, Eye, Pencil, Loader2, FileText, Lock } from "lucide-react";
import { usePermissoes } from "@/contexts/permissoes-context";

interface Processo {
  id: string;
  protocolo: string;
  clienteId: string;
  propriedadeId?: string;
  tipoServico: string;
  status: string;
  dataInicio: string;
  dataFim?: string;
  observacoes?: string;
  cliente: { id: string; nome: string };
  propriedade?: { id: string; nome: string };
}

interface Cliente { id: string; nome: string }
interface Propriedade { id: string; nome: string; clienteId: string }

const tiposServico = [
  "Georreferenciamento",
  "Cadastro no CAR",
  "Regularização ambiental",
  "Emissão de CCIR",
  "Processo INCRA",
  "Licença ambiental",
  "Outros",
];

const emptyForm = {
  clienteId: "", propriedadeId: "", tipoServico: "", observacoes: "",
};

export default function ProcessosPage() {
  const permissoes = usePermissoes();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [atualizarOpen, setAtualizarOpen] = useState(false);
  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);
  const [novoStatus, setNovoStatus] = useState("");
  const [descricaoHistorico, setDescricaoHistorico] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchProcessos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ busca });
      if (filtroStatus !== "todos") params.set("status", filtroStatus);
      const res = await fetch(`/api/processos?${params}`);
      setProcessos(await res.json());
    } finally {
      setLoading(false);
    }
  }, [busca, filtroStatus]);

  useEffect(() => {
    const timer = setTimeout(fetchProcessos, 300);
    return () => clearTimeout(timer);
  }, [fetchProcessos]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
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
      const res = await fetch("/api/processos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          propriedadeId: form.propriedadeId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`Processo criado! Protocolo: ${data.protocolo}`);
      setDialogOpen(false);
      setForm(emptyForm);
      setErros({});
      fetchProcessos();
    } finally {
      setSaving(false);
    }
  }

  async function handleAtualizarStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!processoSelecionado) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/processos/${processoSelecionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus, descricaoHistorico }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao atualizar"); return; }
      toast.success(`Status de ${processoSelecionado.protocolo} atualizado!`);
      setAtualizarOpen(false);
      fetchProcessos();
    } finally {
      setSaving(false);
    }
  }

  function abrirAtualizar(p: Processo) {
    setProcessoSelecionado(p);
    setNovoStatus(p.status);
    setDescricaoHistorico("");
    setAtualizarOpen(true);
  }

  if (!permissoes.verProcessos) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Lock}
          title="Acesso restrito"
          description="Você não tem permissão para visualizar processos. Contate o administrador."
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Processos</h1>
          <p className="text-muted-foreground mt-1">Controle de serviços e processos</p>
        </div>
        {permissoes.cadastrarProcessos && (
          <Button
            onClick={() => { setForm(emptyForm); setErros({}); setDialogOpen(true); }}
            className="bg-sky-500 hover:bg-sky-600"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Processo
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
            aria-label="Buscar processos"
          />
        </div>
        <Select value={filtroStatus} onValueChange={(v) => v !== null && setFiltroStatus(v)}>
          <SelectTrigger className="w-44" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
            <SelectItem value="CONCLUIDO">Concluído</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border shadow-md">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-label="Carregando" />
          </div>
        ) : processos.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={busca || filtroStatus !== "todos" ? "Nenhum processo encontrado" : "Nenhum processo cadastrado"}
            description={busca || filtroStatus !== "todos" ? "Tente outros filtros de busca" : "Crie o primeiro processo para começar"}
            action={
              !busca && filtroStatus === "todos" ? (
                <Button
                  onClick={() => { setForm(emptyForm); setErros({}); setDialogOpen(true); }}
                  className="bg-sky-500 hover:bg-sky-600"
                >
                  <Plus className="mr-2 h-4 w-4" /> Novo Processo
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
                <TableHead>Propriedade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data início</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm font-medium">{p.protocolo}</TableCell>
                  <TableCell>{p.cliente.nome}</TableCell>
                  <TableCell>{p.tipoServico}</TableCell>
                  <TableCell>{p.propriedade?.nome || "-"}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell>{new Date(p.dataInicio).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/processos/${p.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        aria-label={`Ver detalhes do processo ${p.protocolo}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      {permissoes.cadastrarProcessos && (
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => abrirAtualizar(p)}
                          aria-label={`Atualizar status de ${p.protocolo}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog: Novo processo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Processo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="processo-cliente">Cliente *</Label>
              <Select
                value={form.clienteId}
                onValueChange={(v) => v !== null && setForm((f) => ({ ...f, clienteId: v, propriedadeId: "" }))}
              >
                <SelectTrigger id="processo-cliente" aria-invalid={!!erros.clienteId}>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {erros.clienteId && <p className="text-sm text-red-500">{erros.clienteId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="processo-propriedade">Propriedade (opcional)</Label>
              <Select
                value={form.propriedadeId}
                onValueChange={(v) => v !== null && setForm((f) => ({ ...f, propriedadeId: v }))}
              >
                <SelectTrigger id="processo-propriedade">
                  <SelectValue placeholder={form.clienteId ? "Selecione a propriedade" : "Selecione o cliente primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {propriedades.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="processo-tipo">Tipo de Serviço *</Label>
              <Select
                value={form.tipoServico}
                onValueChange={(v) => v !== null && setForm((f) => ({ ...f, tipoServico: v }))}
              >
                <SelectTrigger id="processo-tipo" aria-invalid={!!erros.tipoServico}>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {tiposServico.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {erros.tipoServico && <p className="text-sm text-red-500">{erros.tipoServico}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="processo-obs">Observações</Label>
              <Textarea
                id="processo-obs"
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Criar Processo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Atualizar status */}
      <Dialog open={atualizarOpen} onOpenChange={setAtualizarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Status</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAtualizarStatus} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Protocolo: <span className="font-mono font-bold">{processoSelecionado?.protocolo}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="novo-status">Novo Status *</Label>
              <Select value={novoStatus} onValueChange={(v) => v !== null && setNovoStatus(v)}>
                <SelectTrigger id="novo-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descricao-historico">Descrição (histórico)</Label>
              <Textarea
                id="descricao-historico"
                value={descricaoHistorico}
                onChange={(e) => setDescricaoHistorico(e.target.value)}
                placeholder="Descreva o que foi feito..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAtualizarOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Atualizar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
