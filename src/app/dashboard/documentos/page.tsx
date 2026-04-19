"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
import { Upload, Trash2, Download, Loader2, FolderOpen, Paperclip, Lock } from "lucide-react";
import { usePermissoes } from "@/contexts/permissoes-context";

interface Documento {
  id: string;
  nomeOriginal: string;
  tipo: string;
  tamanho: number;
  caminho: string;
  createdAt: string;
  cliente?: { id: string; nome: string };
  propriedade?: { id: string; nome: string };
  processo?: { id: string; protocolo: string };
}

interface Cliente { id: string; nome: string }
interface Processo { id: string; protocolo: string; tipoServico: string }

const tiposDocumento = ["CAR", "CCIR", "Matrícula", "Licença ambiental", "Contrato", "Outros"];

export default function DocumentosPage() {
  const permissoes = usePermissoes();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});

  const fetchDocumentos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documentos");
      setDocumentos(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocumentos(); }, [fetchDocumentos]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
    fetch("/api/processos").then((r) => r.json()).then(setProcessos);
  }, []);

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    if (!arquivo) novosErros.arquivo = "Selecione um arquivo";
    if (!tipo) novosErros.tipo = "Selecione o tipo do documento";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", arquivo!);
      fd.append("tipo", tipo);
      if (clienteId) fd.append("clienteId", clienteId);
      if (processoId) fd.append("processoId", processoId);

      const res = await fetch("/api/documentos", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Documento enviado!");
      setDialogOpen(false);
      setArquivo(null);
      setTipo("");
      setClienteId("");
      setProcessoId("");
      setErros({});
      fetchDocumentos();
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir() {
    if (!deleteId) return;
    const res = await fetch(`/api/documentos/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Documento removido!");
      fetchDocumentos();
    } else {
      toast.error("Erro ao remover documento");
    }
    setDeleteId(null);
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  if (!permissoes.verDocumentos) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Lock}
          title="Acesso restrito"
          description="Você não tem permissão para visualizar documentos. Contate o administrador."
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
          <p className="text-muted-foreground mt-1">Arquivos e documentos técnicos</p>
        </div>
        {permissoes.cadastrarDocumentos && (
          <Button
            onClick={() => { setArquivo(null); setTipo(""); setClienteId(""); setProcessoId(""); setErros({}); setDialogOpen(true); }}
            className="bg-sky-500 hover:bg-sky-600"
          >
            <Upload className="mr-2 h-4 w-4" /> Enviar Documento
          </Button>
        )}
      </div>

      <div className="bg-card rounded-lg border shadow-md">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-label="Carregando" />
          </div>
        ) : documentos.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Nenhum documento cadastrado"
            description="Envie arquivos PDF, Word, Excel ou imagens"
            action={
              <Button
                onClick={() => { setArquivo(null); setTipo(""); setClienteId(""); setProcessoId(""); setErros({}); setDialogOpen(true); }}
                className="bg-sky-500 hover:bg-sky-600"
              >
                <Upload className="mr-2 h-4 w-4" /> Enviar Documento
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{d.nomeOriginal}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{d.tipo}</span>
                  </TableCell>
                  <TableCell>{d.cliente?.nome || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{d.processo?.protocolo || "-"}</TableCell>
                  <TableCell>{formatBytes(d.tamanho)}</TableCell>
                  <TableCell>{new Date(d.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={d.caminho}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        aria-label={`Baixar ${d.nomeOriginal}`}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </a>
                      {permissoes.cadastrarDocumentos && (
                        <Button
                          variant="ghost" size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setDeleteId(d.id)}
                          aria-label={`Excluir ${d.nomeOriginal}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="doc-arquivo">Arquivo *</Label>
              <input
                id="doc-arquivo"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-sky-50 file:text-sky-600 hover:file:bg-sky-100"
                onChange={(e) => {
                  setArquivo(e.target.files?.[0] || null);
                  if (erros.arquivo) setErros((prev) => ({ ...prev, arquivo: "" }));
                }}
                aria-invalid={!!erros.arquivo}
                aria-describedby={erros.arquivo ? "erro-arquivo" : undefined}
              />
              {arquivo && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Paperclip className="h-3 w-3" aria-hidden="true" />
                  {arquivo.name}
                </p>
              )}
              {erros.arquivo && <p id="erro-arquivo" className="text-sm text-red-500">{erros.arquivo}</p>}
              <p className="text-xs text-gray-400">PDF, Word, Excel, JPG ou PNG — máx. 20 MB</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => { if (v !== null) { setTipo(v); if (erros.tipo) setErros((prev) => ({ ...prev, tipo: "" })); } }}>
                <SelectTrigger id="doc-tipo" aria-invalid={!!erros.tipo}>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDocumento.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {erros.tipo && <p className="text-sm text-red-500">{erros.tipo}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-cliente">Vincular ao Cliente</Label>
              <Select value={clienteId} onValueChange={(v) => v !== null && setClienteId(v)}>
                <SelectTrigger id="doc-cliente"><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-processo">Vincular ao Processo</Label>
              <Select value={processoId} onValueChange={(v) => v !== null && setProcessoId(v)}>
                <SelectTrigger id="doc-processo"><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                <SelectContent>
                  {processos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.protocolo} · {p.tipoServico}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="mr-2 h-4 w-4" aria-hidden="true" />}
                Enviar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>O arquivo será removido permanentemente.</AlertDialogDescription>
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
