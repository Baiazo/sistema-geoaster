"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { usePermissoes } from "@/contexts/permissoes-context";
import {
  ArrowLeft, Loader2, Users, CalendarDays, Trash2, Plus, Upload, CheckCircle2,
} from "lucide-react";

interface Cliente { id: string; nome: string; telefone?: string; email?: string; }
interface Visita { id: string; data: string; observacoes?: string; cliente?: { id: string; nome: string } | null; }
interface Interessado { imovelId: string; clienteId: string; cliente: Cliente; }
interface Documento { id: string; nomeOriginal: string; tipo: string; tamanho: number; caminho: string; createdAt: string; }

function isImagem(doc: Documento) {
  const ext = doc.nomeOriginal.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

interface Imovel {
  id: string;
  categoria: "URBANO" | "RURAL";
  tipo: string;
  status: "DISPONIVEL" | "VENDIDO";
  valor?: number;
  exclusividade: boolean;
  localizacao?: string;
  dataCaptacao?: string;
  areaTotal?: number;
  areaUtil?: number;
  areaReservaLegal?: number;
  areaApp?: number;
  areaAberta?: number;
  areaMata?: number;
  observacoes?: string;
  cliente: Cliente;
  corretor?: { id: string; nome: string; email?: string } | null;
  interessados: Interessado[];
  visitas: Visita[];
  documentos: Documento[];
}

function Campo({ label, valor }: { label: string; valor?: string | number | null }) {
  if (!valor && valor !== 0) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{valor}</p>
    </div>
  );
}

function Area({ label, valor }: { label: string; valor?: number | null }) {
  if (!valor) return null;
  return <Campo label={label} valor={`${valor.toLocaleString("pt-BR")} ha`} />;
}

export default function ImovelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const permissoes = usePermissoes();

  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  // Status
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);

  // Interessados
  const [addInteressadoOpen, setAddInteressadoOpen] = useState(false);
  const [novoInteressadoId, setNovoInteressadoId] = useState("");
  const [salvandoInteressado, setSalvandoInteressado] = useState(false);

  // Visitas
  const [addVisitaOpen, setAddVisitaOpen] = useState(false);
  const [visitaForm, setVisitaForm] = useState({ data: "", clienteId: "", observacoes: "" });
  const [salvandoVisita, setSalvandoVisita] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadedIds, setUploadedIds] = useState<Set<string>>(new Set());
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null);

  const fetchImovel = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/imoveis/${id}`);
      if (!res.ok) { toast.error("Imóvel não encontrado"); router.push("/dashboard/imoveis"); return; }
      setImovel(await res.json());
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchImovel(); }, [fetchImovel]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.ok ? r.json() : []).then((d) => setClientes(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  async function handleStatus(novoStatus: string) {
    if (!imovel) return;
    setAtualizandoStatus(true);
    try {
      const res = await fetch(`/api/imoveis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...imovel, clienteId: imovel.cliente.id, corretorId: imovel.corretor?.id, status: novoStatus }),
      });
      if (!res.ok) { toast.error("Erro ao atualizar status"); return; }
      toast.success("Status atualizado!");
      fetchImovel();
    } finally {
      setAtualizandoStatus(false);
    }
  }

  async function handleAddInteressado(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!novoInteressadoId) return;
    setSalvandoInteressado(true);
    try {
      const res = await fetch(`/api/imoveis/${id}/interessados`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: novoInteressadoId }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
      toast.success("Interessado adicionado!");
      setAddInteressadoOpen(false);
      setNovoInteressadoId("");
      fetchImovel();
    } finally {
      setSalvandoInteressado(false);
    }
  }

  async function handleRemoverInteressado(clienteId: string) {
    const res = await fetch(`/api/imoveis/${id}/interessados`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId }),
    });
    if (res.ok) { toast.success("Removido!"); fetchImovel(); }
    else toast.error("Erro ao remover interessado");
  }

  async function handleAddVisita(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!visitaForm.data) return;
    setSalvandoVisita(true);
    try {
      const res = await fetch(`/api/imoveis/${id}/visitas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...visitaForm, clienteId: visitaForm.clienteId || null }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
      toast.success("Visita registrada!");
      setAddVisitaOpen(false);
      setVisitaForm({ data: "", clienteId: "", observacoes: "" });
      fetchImovel();
    } finally {
      setSalvandoVisita(false);
    }
  }

  async function handleRemoverVisita(visitaId: string) {
    const res = await fetch(`/api/imoveis/${id}/visitas`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitaId }),
    });
    if (res.ok) { toast.success("Visita removida!"); fetchImovel(); }
    else toast.error("Erro ao remover visita");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const tipo = file.type.startsWith("image/") ? "Foto" : file.name.endsWith(".pdf") ? "PDF" : "Documento";
      const fd = new FormData();
      fd.append("arquivo", file);
      fd.append("tipo", tipo);
      fd.append("imovelId", id);
      const res = await fetch("/api/documentos", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
      const doc = await res.json();
      setUploadedIds((s) => new Set([...s, doc.id]));
      toast.success("Arquivo enviado!");
      fetchImovel();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemoverDocumento(docId: string) {
    const res = await fetch(`/api/documentos/${docId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Removido!"); fetchImovel(); }
    else toast.error("Erro ao remover arquivo");
  }

  function formatValor(v?: number) {
    if (!v) return "-";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatBytes(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  if (!imovel) return null;

  const interessadosIds = new Set(imovel.interessados.map((i) => i.clienteId));
  const clientesDisponiveis = clientes.filter((c) => !interessadosIds.has(c.id) && c.id !== imovel.cliente.id);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{imovel.tipo}</h1>
            <Badge variant="outline">{imovel.categoria === "URBANO" ? "Urbano" : "Rural"}</Badge>
            <StatusBadge status={imovel.status} />
            {imovel.exclusividade && <Badge className="bg-yellow-100 text-yellow-800">Exclusivo</Badge>}
          </div>
          {imovel.localizacao && <p className="text-muted-foreground mt-1">{imovel.localizacao}</p>}
        </div>

        {/* Trocar status */}
        {permissoes.cadastrarImoveis && (
          <Select
            value={imovel.status}
            onValueChange={handleStatus}
            disabled={atualizandoStatus}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DISPONIVEL">Disponível</SelectItem>
              <SelectItem value="VENDIDO">Vendido</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna esquerda: info principal */}
        <div className="md:col-span-2 space-y-6">
          {/* Dados básicos */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold mb-4">Informações gerais</h2>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Valor" valor={formatValor(imovel.valor)} />
              <Campo label="Data de captação" valor={imovel.dataCaptacao ? new Date(imovel.dataCaptacao).toLocaleDateString("pt-BR") : undefined} />
              <Campo label="Proprietário" valor={imovel.cliente.nome} />
              <Campo label="Corretor / Captador" valor={imovel.corretor?.nome} />
            </div>
            {imovel.observacoes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">Observações</p>
                <p className="text-sm mt-1">{imovel.observacoes}</p>
              </div>
            )}
          </div>

          {/* Áreas (só rural) */}
          {imovel.categoria === "RURAL" && (
            <div className="bg-card rounded-lg border p-5">
              <h2 className="text-sm font-semibold mb-4">Áreas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Area label="Área total" valor={imovel.areaTotal} />
                <Area label="Área útil" valor={imovel.areaUtil} />
                <Area label="Reserva legal" valor={imovel.areaReservaLegal} />
                <Area label="APP" valor={imovel.areaApp} />
                <Area label="Área aberta" valor={imovel.areaAberta} />
                <Area label="Mata nativa" valor={imovel.areaMata} />
              </div>
              {!imovel.areaTotal && !imovel.areaUtil && (
                <p className="text-sm text-muted-foreground">Nenhuma área informada</p>
              )}
            </div>
          )}

          {/* Fotos e documentos */}
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Fotos e documentos</h2>
              {permissoes.cadastrarImoveis && (
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleUpload} accept="image/*,.pdf,.doc,.docx" />
                  <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium transition-colors">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Enviar arquivo
                  </span>
                </label>
              )}
            </div>
            {imovel.documentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum arquivo enviado</p>
            ) : (
              <>
                {/* Grade de fotos */}
                {imovel.documentos.some(isImagem) && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {imovel.documentos.filter(isImagem).map((doc) => (
                      <button key={doc.id} onClick={() => setPreviewDoc(doc)}
                        className="relative aspect-square rounded-md overflow-hidden border bg-muted hover:opacity-90 transition-opacity">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/documentos/${doc.id}/download`} alt={doc.nomeOriginal}
                          className="w-full h-full object-cover" />
                        {uploadedIds.has(doc.id) && (
                          <span className="absolute top-1 right-1"><CheckCircle2 className="h-4 w-4 text-green-400 drop-shadow" /></span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Lista de outros arquivos */}
                <div className="space-y-2">
                  {imovel.documentos.filter((d) => !isImagem(d)).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        {uploadedIds.has(doc.id) && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.nomeOriginal}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(doc.tamanho)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={`/api/documentos/${doc.id}/download`} target="_blank" rel="noreferrer"
                          className="text-xs text-sky-600 hover:underline px-2">Ver</a>
                        {permissoes.cadastrarImoveis && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
                            onClick={() => handleRemoverDocumento(doc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Coluna direita: interessados e visitas */}
        <div className="space-y-6">
          {/* Interessados */}
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Interessados</h2>
              {permissoes.cadastrarImoveis && clientesDisponiveis.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                  onClick={() => setAddInteressadoOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              )}
            </div>
            {imovel.interessados.length === 0 ? (
              <EmptyState icon={Users} title="Sem interessados" description="" />
            ) : (
              <div className="space-y-2">
                {imovel.interessados.map((int) => (
                  <div key={int.clienteId} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{int.cliente.nome}</p>
                      {int.cliente.telefone && <p className="text-xs text-muted-foreground">{int.cliente.telefone}</p>}
                    </div>
                    {permissoes.cadastrarImoveis && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        onClick={() => handleRemoverInteressado(int.clienteId)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico de visitas */}
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Visitas</h2>
              {permissoes.cadastrarImoveis && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                  onClick={() => setAddVisitaOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Registrar
                </Button>
              )}
            </div>
            {imovel.visitas.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Sem visitas" description="" />
            ) : (
              <div className="space-y-2">
                {imovel.visitas.map((v) => (
                  <div key={v.id} className="p-2 rounded-md border">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {new Date(v.data).toLocaleDateString("pt-BR")}
                      </p>
                      {permissoes.cadastrarImoveis && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => handleRemoverVisita(v.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {v.cliente && <p className="text-xs text-muted-foreground">{v.cliente.nome}</p>}
                    {v.observacoes && <p className="text-xs mt-1">{v.observacoes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog: Adicionar interessado */}
      <Dialog open={addInteressadoOpen} onOpenChange={setAddInteressadoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar interessado</DialogTitle></DialogHeader>
          <form onSubmit={handleAddInteressado} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={novoInteressadoId} onValueChange={setNovoInteressadoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientesDisponiveis.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddInteressadoOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900" disabled={salvandoInteressado || !novoInteressadoId}>
                {salvandoInteressado ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal preview de imagem */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-3xl p-2">
            <DialogHeader className="px-2 pt-2">
              <DialogTitle className="text-sm font-medium truncate">{previewDoc.nomeOriginal}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center bg-muted rounded-md overflow-hidden max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/documentos/${previewDoc.id}/download`} alt={previewDoc.nomeOriginal}
                className="max-w-full max-h-[75vh] object-contain" />
            </div>
            <div className="flex justify-between items-center px-2 pb-2">
              <span className="text-xs text-muted-foreground">{formatBytes(previewDoc.tamanho)}</span>
              <div className="flex gap-2">
                <a href={`/api/documentos/${previewDoc.id}/download`} target="_blank" rel="noreferrer"
                  className="text-xs text-sky-600 hover:underline">Abrir original</a>
                {permissoes.cadastrarImoveis && (
                  <button className="text-xs text-red-500 hover:underline"
                    onClick={() => { handleRemoverDocumento(previewDoc.id); setPreviewDoc(null); }}>
                    Excluir
                  </button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Registrar visita */}
      <Dialog open={addVisitaOpen} onOpenChange={setAddVisitaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar visita</DialogTitle></DialogHeader>
          <form onSubmit={handleAddVisita} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={visitaForm.data}
                onChange={(e) => setVisitaForm((f) => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Interessado (opcional)</Label>
              <Select value={visitaForm.clienteId || "nenhum"} onValueChange={(v) => setVisitaForm((f) => ({ ...f, clienteId: v === "nenhum" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={3} value={visitaForm.observacoes}
                onChange={(e) => setVisitaForm((f) => ({ ...f, observacoes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddVisitaOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                disabled={salvandoVisita || !visitaForm.data}>
                {salvandoVisita ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Registrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
