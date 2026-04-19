"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { Plus, Pencil, Trash2, Loader2, MapPin, Search, User, Ruler, X } from "lucide-react";
import { buscarCep, formatarCep } from "@/lib/cep";

interface Propriedade {
  id: string;
  clienteId: string;
  nome: string;
  cep?: string;
  municipio: string;
  uf?: string;
  area?: number;
  matricula?: string;
  car?: string;
  ccir?: string;
  coordenadas?: string;
  cliente: { id: string; nome: string };
}

interface Cliente { id: string; nome: string }

const emptyForm = {
  clienteId: "", nome: "", cep: "", municipio: "", uf: "", area: "",
  matricula: "", car: "", ccir: "", coordenadas: "",
};

export default function PropriedadesPage() {
  const searchParams = useSearchParams();
  const clienteIdParam = searchParams.get("clienteId");

  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editando, setEditando] = useState<Propriedade | null>(null);
  const [form, setForm] = useState({ ...emptyForm, clienteId: clienteIdParam || "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroUF, setFiltroUF] = useState("todas");
  const [filtroCliente, setFiltroCliente] = useState("todos");

  const fetchPropriedades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/propriedades");
      setPropriedades(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPropriedades(); }, [fetchPropriedades]);
  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then((data) => {
      setClientes(data);
      if (clienteIdParam) setFiltroCliente(clienteIdParam);
    });
  }, [clienteIdParam]);

  // UFs disponíveis para o filtro
  const ufsDisponiveis = useMemo(() => {
    const set = new Set(propriedades.map((p) => p.uf).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [propriedades]);

  // Filtragem client-side
  const resultado = useMemo(() => {
    const termo = busca.toLowerCase();
    return propriedades.filter((p) => {
      const matchBusca = !termo ||
        p.nome.toLowerCase().includes(termo) ||
        p.municipio.toLowerCase().includes(termo) ||
        p.cliente.nome.toLowerCase().includes(termo) ||
        (p.car || "").toLowerCase().includes(termo) ||
        (p.matricula || "").toLowerCase().includes(termo);
      const matchUF = filtroUF === "todas" || p.uf === filtroUF;
      const matchCliente = filtroCliente === "todos" || p.clienteId === filtroCliente;
      return matchBusca && matchUF && matchCliente;
    });
  }, [propriedades, busca, filtroUF, filtroCliente]);

  const temFiltro = busca || filtroUF !== "todas" || filtroCliente !== "todos";

  function limparFiltros() {
    setBusca("");
    setFiltroUF("todas");
    setFiltroCliente("todos");
  }

  function abrirCadastro() {
    setEditando(null);
    setForm({ ...emptyForm, clienteId: clienteIdParam || "" });
    setErros({});
    setDialogOpen(true);
  }

  async function handleCepChange(value: string) {
    const formatted = formatarCep(value);
    setForm((f) => ({ ...f, cep: formatted }));
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      setCepLoading(true);
      setErros((e) => ({ ...e, cep: "" }));
      const data = await buscarCep(digits);
      setCepLoading(false);
      if (!data) {
        setErros((e) => ({ ...e, cep: "CEP não encontrado" }));
      } else {
        setForm((f) => ({ ...f, municipio: data.localidade, uf: data.uf }));
      }
    }
  }

  function abrirEdicao(p: Propriedade) {
    setEditando(p);
    setForm({
      clienteId: p.clienteId, nome: p.nome, cep: p.cep || "",
      municipio: p.municipio, uf: p.uf || "", area: p.area?.toString() || "",
      matricula: p.matricula || "", car: p.car || "", ccir: p.ccir || "",
      coordenadas: p.coordenadas || "",
    });
    setErros({});
    setDialogOpen(true);
  }

  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!form.clienteId) e.clienteId = "Selecione um cliente";
    if (!form.nome.trim()) e.nome = "Nome da propriedade é obrigatório";
    if (!form.municipio.trim()) e.municipio = "Município é obrigatório";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setSaving(true);
    try {
      const payload = { ...form, area: form.area ? parseFloat(form.area) : null };
      const url = editando ? `/api/propriedades/${editando.id}` : "/api/propriedades";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editando ? "Propriedade atualizada!" : "Propriedade cadastrada!");
      setDialogOpen(false);
      fetchPropriedades();
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir() {
    if (!deleteId) return;
    const res = await fetch(`/api/propriedades/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Propriedade removida!");
      fetchPropriedades();
    } else {
      toast.error("Erro ao remover propriedade");
    }
    setDeleteId(null);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propriedades</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Carregando..." : `${propriedades.length} propriedade${propriedades.length !== 1 ? "s" : ""} cadastrada${propriedades.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={abrirCadastro} className="bg-sky-500 hover:bg-sky-600">
          <Plus className="mr-2 h-4 w-4" /> Nova Propriedade
        </Button>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, município, cliente, CAR..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filtroCliente} onValueChange={setFiltroCliente}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clientes</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroUF} onValueChange={setFiltroUF}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os estados</SelectItem>
            {ufsDisponiveis.map((uf) => (
              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {temFiltro && (
          <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-muted-foreground gap-1.5">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {/* Contagem do filtro */}
      {temFiltro && !loading && (
        <p className="text-sm text-muted-foreground mb-4">
          {resultado.length} resultado{resultado.length !== 1 ? "s" : ""} encontrado{resultado.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : propriedades.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhuma propriedade cadastrada"
          description="Cadastre as propriedades rurais dos seus clientes"
          action={
            <Button onClick={abrirCadastro} className="bg-sky-500 hover:bg-sky-600">
              <Plus className="mr-2 h-4 w-4" /> Nova Propriedade
            </Button>
          }
        />
      ) : resultado.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2">
          <MapPin className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Nenhuma propriedade encontrada com esses filtros</p>
          <Button variant="ghost" size="sm" onClick={limparFiltros}>Limpar filtros</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {resultado.map((p) => (
            <div
              key={p.id}
              className="bg-card border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
            >
              {/* Cabeçalho do card */}
              <div className="p-4 pb-3 flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex-shrink-0 bg-sky-100 dark:bg-sky-900/40 rounded-lg p-2">
                    <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{p.nome}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">{p.cliente.nome}</p>
                    </div>
                  </div>
                </div>
                {p.uf && (
                  <span className="flex-shrink-0 text-xs font-semibold bg-muted text-muted-foreground rounded px-2 py-0.5">
                    {p.uf}
                  </span>
                )}
              </div>

              {/* Detalhes */}
              <div className="px-4 pb-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{p.municipio}{p.uf ? `, ${p.uf}` : ""}</span>
                </div>
                {p.area && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Ruler className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{p.area.toLocaleString("pt-BR")} ha</span>
                  </div>
                )}
              </div>

              {/* Badges CAR / CCIR / Matrícula */}
              {(p.car || p.ccir || p.matricula) && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {p.car && (
                    <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5 font-medium">
                      CAR
                    </span>
                  )}
                  {p.ccir && (
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5 font-medium">
                      CCIR
                    </span>
                  )}
                  {p.matricula && (
                    <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-full px-2 py-0.5 font-medium">
                      Matrícula
                    </span>
                  )}
                </div>
              )}

              {/* Ações */}
              <div className="mt-auto border-t px-4 py-2.5 flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => abrirEdicao(p)} aria-label={`Editar ${p.nome}`}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => setDeleteId(p.id)}
                  aria-label={`Excluir ${p.nome}`}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog cadastro/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Propriedade" : "Nova Propriedade"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="prop-cliente">Cliente *</Label>
                <Select value={form.clienteId} onValueChange={(v) => setForm((f) => ({ ...f, clienteId: v }))}>
                  <SelectTrigger id="prop-cliente" aria-invalid={!!erros.clienteId}>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erros.clienteId && <p className="text-sm text-red-500">{erros.clienteId}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="prop-nome">Nome da propriedade *</Label>
                <Input id="prop-nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} aria-invalid={!!erros.nome} />
                {erros.nome && <p className="text-sm text-red-500">{erros.nome}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="prop-cep">CEP</Label>
                <div className="relative">
                  <Input id="prop-cep" placeholder="00000-000" value={form.cep} onChange={(e) => handleCepChange(e.target.value)} maxLength={9} />
                  {cepLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {erros.cep && <p className="text-sm text-red-500">{erros.cep}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-municipio">Município *</Label>
                <Input id="prop-municipio" value={form.municipio} onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))} aria-invalid={!!erros.municipio} />
                {erros.municipio && <p className="text-sm text-red-500">{erros.municipio}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-uf">UF</Label>
                <Input id="prop-uf" placeholder="SP" value={form.uf} onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))} maxLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-area">Área (ha)</Label>
                <Input id="prop-area" type="number" step="0.01" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-matricula">Matrícula</Label>
                <Input id="prop-matricula" value={form.matricula} onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-car">CAR</Label>
                <Input id="prop-car" value={form.car} onChange={(e) => setForm((f) => ({ ...f, car: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-ccir">CCIR</Label>
                <Input id="prop-ccir" value={form.ccir} onChange={(e) => setForm((f) => ({ ...f, ccir: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-coordenadas">Coordenadas</Label>
                <Input id="prop-coordenadas" value={form.coordenadas} onChange={(e) => setForm((f) => ({ ...f, coordenadas: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editando ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover esta propriedade?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
