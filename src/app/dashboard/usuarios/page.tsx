"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/empty-state";
import { Plus, Loader2, Users, Trash2 } from "lucide-react";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfilAcesso: string;
  ativo: boolean;
  createdAt: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", perfilAcesso: "USUARIO" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/usuarios");
      if (!res.ok) { setLoading(false); return; }
      setUsuarios(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    if (!form.nome.trim()) novosErros.nome = "Nome é obrigatório";
    if (!form.email.trim()) {
      novosErros.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      novosErros.email = "Email inválido";
    }
    if (!form.senha) {
      novosErros.senha = "Senha é obrigatória";
    } else if (form.senha.length < 6) {
      novosErros.senha = "Senha deve ter no mínimo 6 caracteres";
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleExcluir() {
    if (!deleteId) return;
    const res = await fetch(`/api/usuarios/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Usuário removido!");
      fetchUsuarios();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erro ao remover usuário");
    }
    setDeleteId(null);
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Usuário criado!");
      setDialogOpen(false);
      setForm({ nome: "", email: "", senha: "", perfilAcesso: "USUARIO" });
      setErros({});
      fetchUsuarios();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento de acesso ao sistema</p>
        </div>
        <Button
          onClick={() => { setForm({ nome: "", email: "", senha: "", perfilAcesso: "USUARIO" }); setErros({}); setDialogOpen(true); }}
          className="bg-sky-500 hover:bg-sky-600"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-md">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-label="Carregando" />
          </div>
        ) : usuarios.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum usuário cadastrado"
            description="Crie contas de acesso para a equipe"
            action={
              <Button
                onClick={() => { setForm({ nome: "", email: "", senha: "", perfilAcesso: "USUARIO" }); setErros({}); setDialogOpen(true); }}
                className="bg-sky-500 hover:bg-sky-600"
              >
                <Plus className="mr-2 h-4 w-4" /> Novo Usuário
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.perfilAcesso === "ADMIN" ? "default" : "secondary"}>
                      {u.perfilAcesso === "ADMIN" ? "Administrador" : "Usuário"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.ativo ? "outline" : "destructive"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir usuário"
                      onClick={() => setDeleteId(u.id)}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário perderá o acesso ao sistema permanentemente.
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="user-nome">Nome *</Label>
              <Input
                id="user-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                aria-invalid={!!erros.nome}
                aria-describedby={erros.nome ? "erro-user-nome" : undefined}
              />
              {erros.nome && <p id="erro-user-nome" className="text-sm text-red-500">{erros.nome}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                aria-invalid={!!erros.email}
                aria-describedby={erros.email ? "erro-user-email" : undefined}
              />
              {erros.email && <p id="erro-user-email" className="text-sm text-red-500">{erros.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-senha">Senha *</Label>
              <Input
                id="user-senha"
                type="password"
                value={form.senha}
                onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                aria-invalid={!!erros.senha}
                aria-describedby={erros.senha ? "erro-user-senha" : undefined}
              />
              {erros.senha && <p id="erro-user-senha" className="text-sm text-red-500">{erros.senha}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-perfil">Perfil</Label>
              <Select value={form.perfilAcesso} onValueChange={(v) => v !== null && setForm((f) => ({ ...f, perfilAcesso: v }))}>
                <SelectTrigger id="user-perfil"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USUARIO">Usuário</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
