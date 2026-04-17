"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react";
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

  const fetchPropriedades = useCallback(async () => {
    setLoading(true);
    try {
      const url = clienteIdParam
        ? `/api/propriedades?clienteId=${clienteIdParam}`
        : "/api/propriedades";
      const res = await fetch(url);
      setPropriedades(await res.json());
    } finally {
      setLoading(false);
    }
  }, [clienteIdParam]);

  useEffect(() => { fetchPropriedades(); }, [fetchPropriedades]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
  }, []);

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
      clienteId: p.clienteId,
      nome: p.nome,
      cep: p.cep || "",
      municipio: p.municipio,
      uf: p.uf || "",
      area: p.area?.toString() || "",
      matricula: p.matricula || "",
      car: p.car || "",
      ccir: p.ccir || "",
      coordenadas: p.coordenadas || "",
    });
    setErros({});
    setDialogOpen(true);
  }

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    if (!form.clienteId) novosErros.clienteId = "Selecione um cliente";
    if (!form.nome.trim()) novosErros.nome = "Nome da propriedade é obrigatório";
    if (!form.municipio.trim()) novosErros.municipio = "Município é obrigatório";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propriedades</h1>
          <p className="text-muted-foreground mt-1">Propriedades rurais vinculadas aos clientes</p>
        </div>
        <Button onClick={abrirCadastro} className="bg-sky-500 hover:bg-sky-600">
          <Plus className="mr-2 h-4 w-4" /> Nova Propriedade
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-md">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-label="Carregando" />
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
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Município</TableHead>
                <TableHead>Área (ha)</TableHead>
                <TableHead>CAR</TableHead>
                <TableHead>CCIR</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {propriedades.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>{p.cliente.nome}</TableCell>
                  <TableCell>{p.municipio}</TableCell>
                  <TableCell>{p.area ?? "-"}</TableCell>
                  <TableCell>{p.car || "-"}</TableCell>
                  <TableCell>{p.ccir || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => abrirEdicao(p)}
                        aria-label={`Editar ${p.nome}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setDeleteId(p.id)}
                        aria-label={`Excluir ${p.nome}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
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
            <DialogTitle>{editando ? "Editar Propriedade" : "Nova Propriedade"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="prop-cliente">Cliente *</Label>
                <Select
                  value={form.clienteId}
                  onValueChange={(v) => v !== null && setForm((f) => ({ ...f, clienteId: v }))}
                >
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
                <Input
                  id="prop-nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  aria-invalid={!!erros.nome}
                />
                {erros.nome && <p className="text-sm text-red-500">{erros.nome}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="prop-cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="prop-cep"
                    placeholder="00000-000"
                    value={form.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    maxLength={9}
                  />
                  {cepLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />}
                </div>
                {erros.cep && <p className="text-sm text-red-500">{erros.cep}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-municipio">Município *</Label>
                <Input
                  id="prop-municipio"
                  value={form.municipio}
                  onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))}
                  aria-invalid={!!erros.municipio}
                />
                {erros.municipio && <p className="text-sm text-red-500">{erros.municipio}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-uf">UF</Label>
                <Input
                  id="prop-uf"
                  placeholder="SP"
                  value={form.uf}
                  onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))}
                  maxLength={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-area">Área (ha)</Label>
                <Input
                  id="prop-area"
                  type="number" step="0.01"
                  value={form.area}
                  onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-matricula">Matrícula</Label>
                <Input
                  id="prop-matricula"
                  value={form.matricula}
                  onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-car">CAR</Label>
                <Input
                  id="prop-car"
                  value={form.car}
                  onChange={(e) => setForm((f) => ({ ...f, car: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-ccir">CCIR</Label>
                <Input
                  id="prop-ccir"
                  value={form.ccir}
                  onChange={(e) => setForm((f) => ({ ...f, ccir: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-coordenadas">Coordenadas</Label>
                <Input
                  id="prop-coordenadas"
                  value={form.coordenadas}
                  onChange={(e) => setForm((f) => ({ ...f, coordenadas: e.target.value }))}
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta propriedade?
            </AlertDialogDescription>
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
