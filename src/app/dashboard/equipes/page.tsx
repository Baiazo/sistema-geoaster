"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { Plus, Pencil, Trash2, Loader2, UsersRound, Lock, Search, UserCheck, Eye } from "lucide-react";
import { usePermissoes } from "@/contexts/permissoes-context";
import { maskTelefone } from "@/lib/masks";

interface Colaborador {
  id: string;
  nome: string;
  cargo?: string;
}

interface Equipe {
  id: string;
  nome: string;
  telefone?: string;
  responsavel?: { id: string; nome: string; cargo?: string };
  membros: { colaborador: { id: string; nome: string; cargo?: string } }[];
  _count: { processos: number };
}

export default function EquipesPage() {
  const permissoes = usePermissoes();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Equipe | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [nomeEquipe, setNomeEquipe] = useState("");
  const [telefoneEquipe, setTelefoneEquipe] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [membrosIds, setMembrosIds] = useState<string[]>([]);
  const [buscaMembros, setBuscaMembros] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});

  const fetchEquipes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/equipes");
      if (!res.ok) { setEquipes([]); return; }
      setEquipes(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEquipes(); }, [fetchEquipes]);

  useEffect(() => {
    fetch("/api/colaboradores")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setColaboradores(data); })
      .catch(() => {});
  }, []);

  const colaboradoresParaSelect = useMemo(() => {
    if (colaboradores.length > 0) {
      if (editando?.responsavel && !colaboradores.find((c) => c.id === editando.responsavel!.id)) {
        return [editando.responsavel, ...colaboradores];
      }
      return colaboradores;
    }
    return editando?.responsavel ? [editando.responsavel] : [];
  }, [colaboradores, editando]);

  const equipesFiltradas = equipes.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (e.responsavel?.nome.toLowerCase().includes(busca.toLowerCase()))
  );

  function abrirNovo() {
    setEditando(null);
    setNomeEquipe("");
    setTelefoneEquipe("");
    setResponsavelId("");
    setMembrosIds([]);
    setBuscaMembros("");
    setErros({});
    setDialogOpen(true);
  }

  function abrirEditar(equipe: Equipe) {
    setEditando(equipe);
    setNomeEquipe(equipe.nome);
    setTelefoneEquipe(equipe.telefone || "");
    setResponsavelId(equipe.responsavel?.id || "");
    setMembrosIds(equipe.membros.map((m) => m.colaborador.id));
    setBuscaMembros("");
    setErros({});
    setDialogOpen(true);
  }

  function toggleMembro(id: string) {
    setMembrosIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    if (!nomeEquipe.trim()) novosErros.nome = "Nome é obrigatório";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setSaving(true);
    try {
      const url = editando ? `/api/equipes/${editando.id}` : "/api/equipes";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeEquipe.trim(),
          telefone: telefoneEquipe.trim() || undefined,
          responsavelId: responsavelId || undefined,
          membrosIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editando ? "Equipe atualizada!" : "Equipe criada!");
      setDialogOpen(false);
      fetchEquipes();
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir() {
    if (!deleteId) return;
    const res = await fetch(`/api/equipes/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Equipe removida!");
      fetchEquipes();
    } else {
      toast.error("Erro ao remover equipe");
    }
    setDeleteId(null);
  }

  if (!permissoes.verEquipes) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Lock}
          title="Acesso restrito"
          description="Você não tem permissão para visualizar equipes. Contate o administrador."
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipes</h1>
          <p className="text-muted-foreground mt-1">Grupos de trabalho e responsáveis</p>
        </div>
        {permissoes.cadastrarEquipes && (
          <Button onClick={abrirNovo} className="bg-sky-500 hover:bg-sky-600">
            <Plus className="mr-2 h-4 w-4" /> Nova Equipe
          </Button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
        <Input
          placeholder="Buscar por nome ou responsável..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar equipes"
        />
      </div>

      <div className="bg-card rounded-lg border shadow-md">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-label="Carregando" />
          </div>
        ) : equipesFiltradas.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={busca ? "Nenhuma equipe encontrada" : "Nenhuma equipe cadastrada"}
            description={busca ? "Tente outros termos de busca" : "Crie a primeira equipe para começar"}
            action={
              !busca && permissoes.cadastrarEquipes ? (
                <Button onClick={abrirNovo} className="bg-sky-500 hover:bg-sky-600">
                  <Plus className="mr-2 h-4 w-4" /> Nova Equipe
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead>Processos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipesFiltradas.map((equipe) => (
                <TableRow key={equipe.id}>
                  <TableCell className="font-medium">{equipe.nome}</TableCell>
                  <TableCell>
                    {equipe.responsavel ? (
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
                        <div>
                          <span>{equipe.responsavel.nome}</span>
                          {equipe.telefone && (
                            <p className="text-xs text-muted-foreground">{equipe.telefone}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-muted-foreground text-sm">Sem responsável</span>
                        {equipe.telefone && (
                          <p className="text-xs text-muted-foreground">{equipe.telefone}</p>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {equipe.membros.slice(0, 3).map((m) => (
                        <span
                          key={m.colaborador.id}
                          className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                        >
                          {m.colaborador.nome.split(" ")[0]}
                        </span>
                      ))}
                      {equipe.membros.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{equipe.membros.length - 3}
                        </span>
                      )}
                      {equipe.membros.length === 0 && (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {equipe._count.processos}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/equipes/${equipe.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        aria-label={`Ver detalhes de ${equipe.nome}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      {permissoes.cadastrarEquipes && (
                        <>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => abrirEditar(equipe)}
                            aria-label={`Editar ${equipe.nome}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setDeleteId(equipe.id)}
                            aria-label={`Excluir ${equipe.nome}`}
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
            <DialogTitle>{editando ? "Editar Equipe" : "Nova Equipe"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="eq-nome">Nome da equipe *</Label>
              <Input
                id="eq-nome"
                value={nomeEquipe}
                onChange={(e) => setNomeEquipe(e.target.value)}
                className={erros.nome ? "border-red-500" : ""}
                aria-invalid={!!erros.nome}
              />
              {erros.nome && <p className="text-sm text-red-500">{erros.nome}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eq-telefone">Telefone de contato</Label>
              <Input
                id="eq-telefone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={telefoneEquipe}
                onChange={(e) => setTelefoneEquipe(maskTelefone(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eq-responsavel">Responsável</Label>
              <Select
                value={responsavelId}
                onValueChange={(v) => {
                  if (v !== null) {
                    setResponsavelId(v);
                    setMembrosIds((prev) => prev.filter((id) => id !== v));
                  }
                }}
              >
                <SelectTrigger id="eq-responsavel">
                  {responsavelId ? (
                    <span className="flex flex-1 text-left text-sm truncate" data-slot="select-value">
                      {colaboradoresParaSelect.find((c) => c.id === responsavelId)?.nome ?? "—"}
                    </span>
                  ) : (
                    <SelectValue placeholder="Selecione o responsável (opcional)" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {colaboradoresParaSelect.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.cargo ? `${c.nome} · ${c.cargo}` : c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Outros membros</Label>
                {membrosIds.length > 0 && (
                  <span className="text-xs text-sky-500 font-medium">
                    {membrosIds.length} selecionado{membrosIds.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {colaboradores.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado</p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <div className="relative border-b">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Buscar colaborador..."
                      value={buscaMembros}
                      onChange={(e) => setBuscaMembros(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                      aria-label="Buscar colaboradores para adicionar"
                    />
                  </div>
                  <div className="divide-y max-h-44 overflow-y-auto">
                    {colaboradores
                      .filter((c) =>
                        c.id !== responsavelId &&
                        (c.nome.toLowerCase().includes(buscaMembros.toLowerCase()) ||
                        (c.cargo && c.cargo.toLowerCase().includes(buscaMembros.toLowerCase())))
                      )
                      .map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={membrosIds.includes(c.id)}
                            onChange={() => toggleMembro(c.id)}
                            className="h-4 w-4 rounded border-gray-300 text-sky-500"
                          />
                          <div>
                            <p className="text-sm font-medium">{c.nome}</p>
                            {c.cargo && <p className="text-xs text-muted-foreground">{c.cargo}</p>}
                          </div>
                        </label>
                      ))}
                    {colaboradores.filter((c) =>
                      c.id !== responsavelId &&
                      (c.nome.toLowerCase().includes(buscaMembros.toLowerCase()) ||
                      (c.cargo && c.cargo.toLowerCase().includes(buscaMembros.toLowerCase())))
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground px-3 py-3">Nenhum resultado encontrado</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {editando ? "Salvar" : "Criar Equipe"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>A equipe será removida. Os processos vinculados não serão afetados.</AlertDialogDescription>
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
