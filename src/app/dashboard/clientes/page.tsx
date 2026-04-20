"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { Plus, Search, Pencil, Trash2, Eye, Loader2, UserRound, Upload, Download, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { usePermissoes } from "@/contexts/permissoes-context";
import { maskCpfCnpj, maskTelefone } from "@/lib/masks";

interface ImportRow {
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  observacoes: string;
  _erro?: string;
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const idx = {
    nome: headers.indexOf("nome"),
    cpfCnpj: ["cpfcnpj", "cpf/cnpj", "cpf_cnpj", "documento"].reduce((a, k) => (a === -1 ? headers.indexOf(k) : a), -1),
    telefone: ["telefone", "fone", "celular"].reduce((a, k) => (a === -1 ? headers.indexOf(k) : a), -1),
    email: headers.indexOf("email"),
    endereco: ["endereco", "endereço", "address"].reduce((a, k) => (a === -1 ? headers.indexOf(k) : a), -1),
    observacoes: ["observacoes", "observações", "obs"].reduce((a, k) => (a === -1 ? headers.indexOf(k) : a), -1),
  };

  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const cols = parseRow(line);
    const nome = idx.nome >= 0 ? cols[idx.nome] ?? "" : "";
    const cpfCnpj = idx.cpfCnpj >= 0 ? cols[idx.cpfCnpj] ?? "" : "";
    const erros: string[] = [];
    if (!nome) erros.push("nome obrigatório");
    if (!cpfCnpj) erros.push("CPF/CNPJ obrigatório");
    return {
      nome,
      cpfCnpj,
      telefone: idx.telefone >= 0 ? cols[idx.telefone] ?? "" : "",
      email: idx.email >= 0 ? cols[idx.email] ?? "" : "",
      endereco: idx.endereco >= 0 ? cols[idx.endereco] ?? "" : "",
      observacoes: idx.observacoes >= 0 ? cols[idx.observacoes] ?? "" : "",
      _erro: erros.length ? erros.join(", ") : undefined,
    };
  });
}

const MODELO_CSV =
  "nome,cpfCnpj,telefone,email,endereco,observacoes\n" +
  "João da Silva,123.456.789-00,(11) 99999-9999,joao@email.com,\"Rua das Flores, 123\",Cliente antigo\n" +
  "Empresa XYZ Ltda,12.345.678/0001-99,(11) 3333-4444,contato@xyz.com,,\n";

interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  _count?: { propriedades: number; processos: number };
}

const emptyForm = {
  nome: "", cpfCnpj: "", telefone: "", email: "", endereco: "", observacoes: "",
};

export default function ClientesPage() {
  const permissoes = usePermissoes();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ importados: number; ignorados: number } | null>(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes?busca=${encodeURIComponent(busca)}`);
      const data = await res.json();
      setClientes(data);
    } finally {
      setLoading(false);
    }
  }, [busca]);

  useEffect(() => {
    const timer = setTimeout(fetchClientes, 300);
    return () => clearTimeout(timer);
  }, [fetchClientes]);

  function abrirCadastro() {
    setEditando(null);
    setForm(emptyForm);
    setErros({});
    setDialogOpen(true);
  }

  function abrirEdicao(c: Cliente) {
    setEditando(c);
    setForm({
      nome: c.nome,
      cpfCnpj: c.cpfCnpj,
      telefone: c.telefone || "",
      email: c.email || "",
      endereco: c.endereco || "",
      observacoes: c.observacoes || "",
    });
    setErros({});
    setDialogOpen(true);
  }

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Nome é obrigatório";
    if (!form.cpfCnpj.trim()) novosErros.cpfCnpj = "CPF/CNPJ é obrigatório";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      novosErros.email = "Email inválido";
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setSaving(true);
    try {
      const url = editando ? `/api/clientes/${editando.id}` : "/api/clientes";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editando ? "Cliente atualizado!" : "Cliente cadastrado!");
      setDialogOpen(false);
      fetchClientes();
    } finally {
      setSaving(false);
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportRows(parseCSV(text));
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }

  function downloadModelo() {
    const blob = new Blob(["\uFEFF" + MODELO_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportar() {
    const validos = importRows.filter((r) => !r._erro);
    if (validos.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/clientes/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientes: validos }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setImportResult(data);
      setImportRows([]);
      fetchClientes();
    } finally {
      setImporting(false);
    }
  }

  async function handleExcluir() {
    if (!deleteId) return;
    const res = await fetch(`/api/clientes/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Cliente removido!");
      fetchClientes();
    } else {
      toast.error("Erro ao remover cliente");
    }
    setDeleteId(null);
  }

  if (!permissoes.verClientes) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Lock}
          title="Acesso restrito"
          description="Você não tem permissão para visualizar clientes. Contate o administrador."
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie os clientes da assessoria</p>
        </div>
        {permissoes.cadastrarClientes && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setImportRows([]); setImportResult(null); setImportDialogOpen(true); }}>
              <Upload className="mr-2 h-4 w-4" /> Importar CSV
            </Button>
            <Button onClick={abrirCadastro} className="bg-sky-500 hover:bg-sky-600">
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </div>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
        <Input
          placeholder="Buscar por nome, CPF/CNPJ ou email..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar clientes"
        />
      </div>

      <div className="bg-card rounded-lg border shadow-md">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-label="Carregando" />
          </div>
        ) : clientes.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title={busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            description={busca ? "Tente outro termo de busca" : "Cadastre seu primeiro cliente para começar"}
            action={
              !busca && permissoes.cadastrarClientes ? (
                <Button onClick={abrirCadastro} className="bg-sky-500 hover:bg-sky-600">
                  <Plus className="mr-2 h-4 w-4" /> Novo Cliente
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Propriedades</TableHead>
                <TableHead>Processos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.cpfCnpj}</TableCell>
                  <TableCell>{c.telefone || "-"}</TableCell>
                  <TableCell>{c.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c._count?.propriedades ?? 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c._count?.processos ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/clientes/${c.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        aria-label={`Ver detalhes de ${c.nome}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      {permissoes.cadastrarClientes && (
                        <>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => abrirEdicao(c)}
                            aria-label={`Editar ${c.nome}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setDeleteId(c.id)}
                            aria-label={`Excluir ${c.nome}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cliente-nome">Nome *</Label>
                <Input
                  id="cliente-nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  aria-invalid={!!erros.nome}
                  aria-describedby={erros.nome ? "erro-nome" : undefined}
                />
                {erros.nome && <p id="erro-nome" className="text-sm text-red-500">{erros.nome}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cliente-cpfcnpj">CPF/CNPJ *</Label>
                <Input
                  id="cliente-cpfcnpj"
                  value={form.cpfCnpj}
                  onChange={(e) => setForm((f) => ({ ...f, cpfCnpj: maskCpfCnpj(e.target.value) }))}
                  aria-invalid={!!erros.cpfCnpj}
                  aria-describedby={erros.cpfCnpj ? "erro-cpfcnpj" : undefined}
                />
                {erros.cpfCnpj && <p id="erro-cpfcnpj" className="text-sm text-red-500">{erros.cpfCnpj}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cliente-telefone">Telefone</Label>
                <Input
                  id="cliente-telefone"
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: maskTelefone(e.target.value) }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cliente-email">Email</Label>
                <Input
                  id="cliente-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  aria-invalid={!!erros.email}
                  aria-describedby={erros.email ? "erro-email" : undefined}
                />
                {erros.email && <p id="erro-email" className="text-sm text-red-500">{erros.email}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cliente-endereco">Endereço</Label>
                <Input
                  id="cliente-endereco"
                  value={form.endereco}
                  onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cliente-observacoes">Observações</Label>
                <Textarea
                  id="cliente-observacoes"
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {editando ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) { setImportRows([]); setImportResult(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar clientes via CSV</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted text-sm">
              <span className="text-muted-foreground">Colunas esperadas: <strong>nome</strong>, <strong>cpfCnpj</strong>, telefone, email, endereco, observacoes</span>
              <Button variant="ghost" size="sm" onClick={downloadModelo} className="shrink-0 ml-2">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar modelo
              </Button>
            </div>

            {!importResult && (
              <div>
                <label htmlFor="csv-input" className="block text-sm font-medium mb-1.5">Selecionar arquivo CSV</label>
                <input
                  id="csv-input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleImportFile}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-sky-50 file:text-sky-600 hover:file:bg-sky-100 cursor-pointer"
                />
              </div>
            )}

            {importResult && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{importResult.importados} cliente{importResult.importados !== 1 ? "s" : ""} importado{importResult.importados !== 1 ? "s" : ""}</span>
                </div>
                {importResult.ignorados > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{importResult.ignorados} ignorado{importResult.ignorados !== 1 ? "s" : ""} (CPF/CNPJ já cadastrado)</span>
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => { setImportResult(null); setImportRows([]); }}>
                  Importar outro arquivo
                </Button>
              </div>
            )}

            {importRows.length > 0 && !importResult && (() => {
              const comErro = importRows.filter((r) => r._erro);
              const validos = importRows.filter((r) => !r._erro);
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 font-medium">{validos.length} válido{validos.length !== 1 ? "s" : ""}</span>
                    {comErro.length > 0 && <span className="text-red-500 font-medium">{comErro.length} com erro</span>}
                  </div>

                  <div className="rounded-md border overflow-hidden">
                    <div className="overflow-y-auto max-h-48">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8" />
                            <TableHead>Nome</TableHead>
                            <TableHead>CPF/CNPJ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importRows.slice(0, 10).map((r, i) => (
                            <TableRow key={i} className={r._erro ? "bg-red-50 dark:bg-red-950/20" : ""}>
                              <TableCell className="py-1.5 w-8">
                                {r._erro ? (
                                  <span title={r._erro}>
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  </span>
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </TableCell>
                              <TableCell className="py-1.5 text-sm font-medium truncate max-w-[180px]">
                                {r.nome || <span className="text-red-500 italic font-normal">vazio</span>}
                              </TableCell>
                              <TableCell className="py-1.5 text-sm text-muted-foreground">
                                {r.cpfCnpj || <span className="text-red-500 italic">vazio</span>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {importRows.length > 10 && (
                      <p className="text-xs text-muted-foreground px-4 py-2 border-t">
                        ...e mais {importRows.length - 10} linha{importRows.length - 10 !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setImportRows([])}>Limpar</Button>
                    <Button
                      className="bg-sky-500 hover:bg-sky-600"
                      onClick={handleImportar}
                      disabled={importing || validos.length === 0}
                    >
                      {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Importar {validos.length} cliente{validos.length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este cliente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
