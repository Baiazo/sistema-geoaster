"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { EmptyState } from "@/components/empty-state";
import { Plus, Pencil, Trash2, Loader2, Users, Lock, Search } from "lucide-react";
import { usePermissoes } from "@/contexts/permissoes-context";
import { maskCpf } from "@/lib/masks";

interface Colaborador {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  cargo?: string;
  ativo: boolean;
  _count: { equipesComoMembro: number };
}

const emptyForm = { nome: "", cpf: "", email: "", cargo: "" };

export default function ColaboradoresPage() {
  const permissoes = usePermissoes();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchColaboradores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/colaboradores");
      if (!res.ok) { setColaboradores([]); return; }
      setColaboradores(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchColaboradores(); }, [fetchColaboradores]);

  const colaboradoresFiltrados = colaboradores.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.cargo && c.cargo.toLowerCase().includes(busca.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(busca.toLowerCase()))
  );

  function abrirNovo() {
    setEditando(null);
    setForm(emptyForm);
    setErros({});
    setDialogOpen(true);
  }

  function abrirEditar(c: Colaborador) {
    setEditando(c);
    setForm({ nome: c.nome, cpf: c.cpf || "", email: c.email || "", cargo: c.cargo || "" });
    setErros({});
    setDialogOpen(true);
  }

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Nome é obrigatório";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      novosErros.email = "E-mail inválido";
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setSaving(true);
    try {
      const url = editando ? `/api/colaboradores/${editando.id}` : "/api/colaboradores";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(),
          cpf: form.cpf.trim() || undefined,
          email: form.email.trim() || undefined,
          cargo: form.cargo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editando ? "Colaborador atualizado!" : "Colaborador cadastrado!");
      setDialogOpen(false);
      fetchColaboradores();
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir() {
    if (!deleteId) return;
    const res = await fetch(`/api/colaboradores/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Colaborador removido!");
      fetchColaboradores();
    } else {
      toast.error("Erro ao remover colaborador");
    }
    setDeleteId(null);
  }

  if (!permissoes.verColaboradores) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Lock}
          title="Acesso restrito"
          description="Você não tem permissão para visualizar colaboradores. Contate o administrador."
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground mt-1">Membros da equipe técnica</p>
        </div>
        {permissoes.cadastrarColaboradores && (
          <Button onClick={abrirNovo} className="bg-sky-500 hover:bg-sky-600">
            <Plus className="mr-2 h-4 w-4" /> Novo Colaborador
          </Button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
        <Input
          placeholder="Buscar por nome, cargo ou e-mail..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar colaboradores"
        />
      </div>

      <div className="bg-card rounded-lg border shadow-md">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-label="Carregando" />
          </div>
        ) : colaboradoresFiltrados.length === 0 ? (
          <EmptyState
            icon={Users}
            title={busca ? "Nenhum colaborador encontrado" : "Nenhum colaborador cadastrado"}
            description={busca ? "Tente outros termos de busca" : "Cadastre o primeiro colaborador para começar"}
            action={
              !busca && permissoes.cadastrarColaboradores ? (
                <Button onClick={abrirNovo} className="bg-sky-500 hover:bg-sky-600">
                  <Plus className="mr-2 h-4 w-4" /> Novo Colaborador
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Equipes</TableHead>
                {permissoes.cadastrarColaboradores && (
                  <TableHead className="text-right">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradoresFiltrados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.cargo || "-"}</TableCell>
                  <TableCell>{c.email || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{c.cpf || "-"}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {c._count.equipesComoMembro}
                    </span>
                  </TableCell>
                  {permissoes.cadastrarColaboradores && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => abrirEditar(c)}
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
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="col-nome">Nome *</Label>
              <Input
                id="col-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className={erros.nome ? "border-red-500" : ""}
                aria-invalid={!!erros.nome}
              />
              {erros.nome && <p className="text-sm text-red-500">{erros.nome}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-cargo">Cargo</Label>
              <Input
                id="col-cargo"
                value={form.cargo}
                placeholder="Ex: Técnico em Georreferenciamento"
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-email">E-mail</Label>
              <Input
                id="col-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={erros.email ? "border-red-500" : ""}
                aria-invalid={!!erros.email}
              />
              {erros.email && <p className="text-sm text-red-500">{erros.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-cpf">CPF</Label>
              <Input
                id="col-cpf"
                value={form.cpf}
                placeholder="000.000.000-00"
                onChange={(e) => setForm((f) => ({ ...f, cpf: maskCpf(e.target.value) }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
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
            <AlertDialogDescription>O colaborador será removido do sistema.</AlertDialogDescription>
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
