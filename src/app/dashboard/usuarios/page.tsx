"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Loader2, Users, Trash2, Pencil, ShieldCheck, KeyRound } from "lucide-react";
import {
  type Permissoes,
  PERMISSOES_PADRAO,
  GRUPOS_PERMISSOES,
  getPermissoesEfetivas,
} from "@/lib/permissoes";
import { SETOR_CONFIG, TODOS_SETORES } from "@/lib/setores";
import type { Setor } from "@/lib/setores";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfilAcesso: string;
  ativo: boolean;
  createdAt: string;
  permissoes?: Record<string, boolean>;
  setores: Setor[];
}

const emptyCreate = { nome: "", email: "", senha: "", perfilAcesso: "USUARIO", setores: [] as Setor[] };

function SetorCheckboxes({
  value,
  onChange,
}: {
  value: Setor[];
  onChange: (setores: Setor[]) => void;
}) {
  function toggle(setor: Setor) {
    if (value.includes(setor)) {
      onChange(value.filter((s) => s !== setor));
    } else {
      onChange([...value, setor]);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>Setores de acesso</Label>
      <p className="text-xs text-muted-foreground">Nenhum selecionado = acesso a todos os setores</p>
      <div className="flex flex-col gap-2 pt-1">
        {TODOS_SETORES.map((setor) => {
          const cfg = SETOR_CONFIG[setor];
          return (
            <label key={setor} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={value.includes(setor)}
                onChange={() => toggle(setor)}
                className="h-4 w-4 rounded border-border accent-current"
              />
              <span className="text-sm">{cfg.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [criarOpen, setCriarOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [createErros, setCreateErros] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const [editando, setEditando] = useState<Usuario | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: "", email: "", perfilAcesso: "USUARIO", ativo: true,
    permissoes: { ...PERMISSOES_PADRAO },
    setores: [] as Setor[],
  });
  const [editErros, setEditErros] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [resetSenhaOpen, setResetSenhaOpen] = useState(false);
  const [resetSenhaForm, setResetSenhaForm] = useState({ senha: "", confirmar: "" });
  const [resetSenhaErros, setResetSenhaErros] = useState<Record<string, string>>({});
  const [resetSenhaLoading, setResetSenhaLoading] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/usuarios");
      if (!res.ok) return;
      setUsuarios(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  function validarCreate(): boolean {
    const e: Record<string, string> = {};
    if (!createForm.nome.trim()) e.nome = "Nome é obrigatório";
    if (!createForm.email.trim()) {
      e.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      e.email = "Email inválido";
    }
    if (!createForm.senha) {
      e.senha = "Senha é obrigatória";
    } else if (createForm.senha.length < 6) {
      e.senha = "Senha deve ter no mínimo 6 caracteres";
    }
    setCreateErros(e);
    return Object.keys(e).length === 0;
  }

  function validarEdit(): boolean {
    const e: Record<string, string> = {};
    if (!editForm.nome.trim()) e.nome = "Nome é obrigatório";
    if (!editForm.email.trim()) {
      e.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      e.email = "Email inválido";
    }
    setEditErros(e);
    return Object.keys(e).length === 0;
  }

  function validarResetSenha(): boolean {
    const e: Record<string, string> = {};
    if (!resetSenhaForm.senha) {
      e.senha = "Senha é obrigatória";
    } else if (resetSenhaForm.senha.length < 8) {
      e.senha = "Senha deve ter no mínimo 8 caracteres";
    }
    if (resetSenhaForm.senha !== resetSenhaForm.confirmar) {
      e.confirmar = "As senhas não coincidem";
    }
    setResetSenhaErros(e);
    return Object.keys(e).length === 0;
  }

  function abrirResetSenha(u: Usuario) {
    setEditando(u);
    setResetSenhaForm({ senha: "", confirmar: "" });
    setResetSenhaErros({});
    setResetSenhaOpen(true);
  }

  async function handleResetSenha(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!editando || !validarResetSenha()) return;
    setResetSenhaLoading(true);
    try {
      const res = await fetch(`/api/usuarios/${editando.id}/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: resetSenhaForm.senha }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Senha redefinida com sucesso!");
      setResetSenhaOpen(false);
      setResetSenhaForm({ senha: "", confirmar: "" });
    } finally {
      setResetSenhaLoading(false);
    }
  }

  async function handleCriar(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!validarCreate()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Usuário criado!");
      setCriarOpen(false);
      setCreateForm(emptyCreate);
      setCreateErros({});
      fetchUsuarios();
    } finally {
      setCreating(false);
    }
  }

  function abrirEdicao(u: Usuario) {
    setEditando(u);
    setEditForm({
      nome: u.nome,
      email: u.email,
      perfilAcesso: u.perfilAcesso,
      ativo: u.ativo,
      permissoes: getPermissoesEfetivas(u.perfilAcesso, u.permissoes),
      setores: u.setores ?? [],
    });
    setEditErros({});
    setEditOpen(true);
  }

  async function handleEditar(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!editando || !validarEdit()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/usuarios/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editForm.nome,
          email: editForm.email,
          perfilAcesso: editForm.perfilAcesso,
          ativo: editForm.ativo,
          permissoes: editForm.perfilAcesso === "ADMIN" ? {} : editForm.permissoes,
          setores: editForm.setores,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Usuário atualizado!");
      setEditOpen(false);
      fetchUsuarios();
    } finally {
      setSaving(false);
    }
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

  const dependencias: Partial<Record<keyof Permissoes, keyof Permissoes>> = {
    cadastrarClientes: "verClientes",
    cadastrarPropriedades: "verPropriedades",
    cadastrarDocumentos: "verDocumentos",
    cadastrarProcessos: "verProcessos",
    cadastrarColaboradores: "verColaboradores",
    cadastrarEquipes: "verEquipes",
  };

  function togglePermissao(chave: keyof Permissoes, val: boolean) {
    setEditForm((f) => {
      const novas = { ...f.permissoes, [chave]: val };
      if (val && dependencias[chave]) {
        novas[dependencias[chave]!] = true;
      }
      const dependente = (Object.keys(dependencias) as (keyof Permissoes)[])
        .find((k) => dependencias[k] === chave);
      if (!val && dependente) {
        novas[dependente] = false;
      }
      return { ...f, permissoes: novas };
    });
  }

  function getSetoresLabel(setores: Setor[]) {
    if (!setores || setores.length === 0) return "Todos";
    return setores.map((s) => SETOR_CONFIG[s].labelCurto).join(", ");
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento de acesso ao sistema</p>
        </div>
        <Button
          onClick={() => { setCreateForm(emptyCreate); setCreateErros({}); setCriarOpen(true); }}
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
                onClick={() => { setCreateForm(emptyCreate); setCreateErros({}); setCriarOpen(true); }}
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
                <TableHead>Setores</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {getSetoresLabel(u.setores)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.ativo ? "outline" : "destructive"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon"
                        aria-label={`Editar ${u.nome}`}
                        onClick={() => abrirEdicao(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        aria-label={`Redefinir senha de ${u.nome}`}
                        onClick={() => abrirResetSenha(u)}
                        className="text-muted-foreground hover:text-amber-600"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        aria-label={`Excluir ${u.nome}`}
                        onClick={() => setDeleteId(u.id)}
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog: Criar usuário */}
      <Dialog open={criarOpen} onOpenChange={setCriarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="user-nome">Nome *</Label>
              <Input
                id="user-nome"
                value={createForm.nome}
                onChange={(e) => setCreateForm((f) => ({ ...f, nome: e.target.value }))}
                aria-invalid={!!createErros.nome}
              />
              {createErros.nome && <p className="text-sm text-red-500">{createErros.nome}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                aria-invalid={!!createErros.email}
              />
              {createErros.email && <p className="text-sm text-red-500">{createErros.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-senha">Senha *</Label>
              <Input
                id="user-senha"
                type="password"
                value={createForm.senha}
                onChange={(e) => setCreateForm((f) => ({ ...f, senha: e.target.value }))}
                aria-invalid={!!createErros.senha}
              />
              {createErros.senha && <p className="text-sm text-red-500">{createErros.senha}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-perfil">Perfil</Label>
              <Select
                value={createForm.perfilAcesso}
                onValueChange={(v) => v && setCreateForm((f) => ({ ...f, perfilAcesso: v }))}
              >
                <SelectTrigger id="user-perfil"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USUARIO">Usuário</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                As permissões podem ser ajustadas após a criação.
              </p>
            </div>
            <SetorCheckboxes
              value={createForm.setores}
              onChange={(setores) => setCreateForm((f) => ({ ...f, setores }))}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCriarOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar usuário + permissões */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditar} noValidate>
            <div className="overflow-y-auto max-h-[65vh] pr-1 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-nome">Nome *</Label>
                <Input
                  id="edit-nome"
                  value={editForm.nome}
                  onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                  aria-invalid={!!editErros.nome}
                />
                {editErros.nome && <p className="text-sm text-red-500">{editErros.nome}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  aria-invalid={!!editErros.email}
                />
                {editErros.email && <p className="text-sm text-red-500">{editErros.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-perfil">Perfil</Label>
                <Select
                  value={editForm.perfilAcesso}
                  onValueChange={(v) => v && setEditForm((f) => ({ ...f, perfilAcesso: v }))}
                >
                  <SelectTrigger id="edit-perfil"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USUARIO">Usuário</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SetorCheckboxes
                value={editForm.setores}
                onChange={(setores) => setEditForm((f) => ({ ...f, setores }))}
              />

              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Conta ativa</p>
                  <p className="text-xs text-muted-foreground">Usuário inativo não consegue fazer login</p>
                </div>
                <Switch
                  id="edit-ativo"
                  checked={editForm.ativo}
                  onCheckedChange={(val) => setEditForm((f) => ({ ...f, ativo: val }))}
                />
              </div>

              {editForm.perfilAcesso === "USUARIO" && (
                <div className="space-y-4 pt-1 border-t">
                  <div className="flex items-center gap-2 pt-2">
                    <ShieldCheck className="h-4 w-4 text-sky-500" aria-hidden="true" />
                    <h3 className="text-sm font-semibold">Permissões de Acesso</h3>
                  </div>

                  {GRUPOS_PERMISSOES.map((grupo) => (
                    <div key={grupo.modulo}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        {grupo.modulo}
                      </p>
                      <div className="space-y-1">
                        {grupo.permissoes.map(({ chave, label }) => (
                          <div
                            key={chave}
                            className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <Label
                              htmlFor={`perm-${chave}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {label}
                            </Label>
                            <Switch
                              id={`perm-${chave}`}
                              checked={editForm.permissoes[chave]}
                              onCheckedChange={(val) => togglePermissao(chave, val)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <p className="text-xs text-muted-foreground pb-1">
                    Administradores têm acesso completo independente das permissões acima.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Redefinir senha */}
      <Dialog open={resetSenhaOpen} onOpenChange={setResetSenhaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetSenha} className="space-y-4" noValidate>
            <p className="text-sm text-muted-foreground">
              Defina uma nova senha para <strong>{editando?.nome}</strong> ({editando?.email}).
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reset-senha">Nova senha *</Label>
              <Input
                id="reset-senha"
                type="password"
                value={resetSenhaForm.senha}
                onChange={(e) => setResetSenhaForm((f) => ({ ...f, senha: e.target.value }))}
                aria-invalid={!!resetSenhaErros.senha}
              />
              {resetSenhaErros.senha && <p className="text-sm text-red-500">{resetSenhaErros.senha}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-confirmar">Confirmar senha *</Label>
              <Input
                id="reset-confirmar"
                type="password"
                value={resetSenhaForm.confirmar}
                onChange={(e) => setResetSenhaForm((f) => ({ ...f, confirmar: e.target.value }))}
                aria-invalid={!!resetSenhaErros.confirmar}
              />
              {resetSenhaErros.confirmar && <p className="text-sm text-red-500">{resetSenhaErros.confirmar}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setResetSenhaOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={resetSenhaLoading}>
                {resetSenhaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Redefinir
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
