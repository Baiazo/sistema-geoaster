"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, Eye, Pencil, Trash2, Loader2, Building2, Lock } from "lucide-react";
import { usePermissoes } from "@/contexts/permissoes-context";
import { StatusBadge } from "@/components/status-badge";
import { buscarCep, formatarCep } from "@/lib/cep";

const TIPOS_URBANO = ["Casa", "Apartamento", "Terreno"];
const TIPOS_RURAL = ["Fazenda", "Sítio", "Chácara", "Área de plantio", "Pecuária"];

interface Imovel {
  id: string;
  categoria: "URBANO" | "RURAL";
  tipo: string;
  status: "DISPONIVEL" | "VENDIDO";
  valor?: number;
  exclusividade: boolean;
  localizacao?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  areaM2?: number;
  dataCaptacao?: string;
  cliente: { id: string; nome: string };
  corretor?: { id: string; nome: string } | null;
  _count: { interessados: number; visitas: number; documentos: number };
}

interface Cliente { id: string; nome: string; }
interface Usuario { id: string; nome: string; }

const emptyForm = {
  clienteId: "", corretorId: "", categoria: "RURAL" as "URBANO" | "RURAL", tipo: "",
  valor: "", exclusividade: false, dataCaptacao: "", localizacao: "",
  cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "",
  areaM2: "", areaTotal: "", areaUtil: "", areaReservaLegal: "", areaApp: "", areaAberta: "", areaMata: "",
  observacoes: "",
};

export default function ImoveisPage() {
  const permissoes = usePermissoes();
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Imovel | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  const tiposDisponiveis = form.categoria === "URBANO" ? TIPOS_URBANO : TIPOS_RURAL;

  const fetchImoveis = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ busca, status: filtroStatus, categoria: filtroCategoria });
      const res = await fetch(`/api/imoveis?${params}`);
      if (res.ok) setImoveis(await res.json());
    } finally {
      setLoading(false);
    }
  }, [busca, filtroStatus, filtroCategoria]);

  useEffect(() => {
    const t = setTimeout(fetchImoveis, 300);
    return () => clearTimeout(t);
  }, [fetchImoveis]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.ok ? r.json() : []).then((d) => setClientes(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/imoveis/corretores").then((r) => r.ok ? r.json() : []).then((d) => setUsuarios(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  function abrirCadastro() {
    setEditando(null);
    setForm(emptyForm);
    setErros({});
    setDialogOpen(true);
  }

  async function handleCepChange(value: string) {
    const formatted = formatarCep(value);
    setForm((f) => ({ ...f, cep: formatted }));
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      setCepLoading(true);
      const data = await buscarCep(digits);
      setCepLoading(false);
      if (data) {
        setForm((f) => ({
          ...f,
          rua: data.logradouro || f.rua,
          bairro: data.bairro || f.bairro,
          cidade: data.localidade || f.cidade,
          estado: data.uf || f.estado,
        }));
      }
    }
  }

  function abrirEdicao(i: Imovel) {
    setEditando(i);
    setForm({
      clienteId: i.cliente.id,
      corretorId: i.corretor?.id ?? "",
      categoria: i.categoria,
      tipo: i.tipo,
      valor: i.valor ? i.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
      exclusividade: i.exclusividade,
      dataCaptacao: i.dataCaptacao ? i.dataCaptacao.slice(0, 10) : "",
      localizacao: i.localizacao ?? "",
      cep: i.cep ?? "",
      rua: i.rua ?? "",
      numero: i.numero ?? "",
      bairro: i.bairro ?? "",
      cidade: i.cidade ?? "",
      estado: i.estado ?? "",
      areaM2: i.areaM2 ? i.areaM2.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
      areaTotal: "", areaUtil: "", areaReservaLegal: "", areaApp: "", areaAberta: "", areaMata: "",
      observacoes: i.observacoes ?? "",
    });
    setErros({});
    setDialogOpen(true);
  }

  function validar() {
    const e: Record<string, string> = {};
    if (!form.clienteId) e.clienteId = "Proprietário é obrigatório";
    if (!form.tipo) e.tipo = "Tipo é obrigatório";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSalvar(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!validar()) return;
    setSaving(true);
    try {
      const url = editando ? `/api/imoveis/${editando.id}` : "/api/imoveis";
      const method = editando ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: editando?.status ?? "DISPONIVEL", valor: parseMoedaInput(form.valor) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editando ? "Imóvel atualizado!" : "Imóvel cadastrado!");
      setDialogOpen(false);
      fetchImoveis();
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir() {
    if (!deleteId) return;
    const res = await fetch(`/api/imoveis/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Imóvel removido!");
      fetchImoveis();
    } else {
      toast.error("Erro ao remover imóvel");
    }
    setDeleteId(null);
  }

  function formatValor(v?: number) {
    if (!v) return "-";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatarInputMoeda(input: string): string {
    const digits = input.replace(/\D/g, "");
    if (!digits) return "";
    return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseMoedaInput(formatted: string): number | undefined {
    if (!formatted) return undefined;
    const n = parseFloat(formatted.replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? undefined : n;
  }

  if (!permissoes.verImoveis) {
    return (
      <div className="p-8">
        <EmptyState icon={Lock} title="Acesso restrito" description="Você não tem permissão para visualizar imóveis." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Imóveis</h1>
          <p className="text-muted-foreground mt-1">Carteira de imóveis B.Aster</p>
        </div>
        {permissoes.cadastrarImoveis && (
          <Button onClick={abrirCadastro} className="bg-yellow-400 hover:bg-yellow-500 text-gray-900">
            <Plus className="mr-2 h-4 w-4" /> Novo Imóvel
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar por tipo, localização ou proprietário..." className="pl-9"
            value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={filtroCategoria || "todos"} onValueChange={(v) => setFiltroCategoria(v === "todos" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="URBANO">Urbano</SelectItem>
            <SelectItem value="RURAL">Rural</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroStatus || "todos"} onValueChange={(v) => setFiltroStatus(v === "todos" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="DISPONIVEL">Disponível</SelectItem>
            <SelectItem value="VENDIDO">Vendido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border shadow-md">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : imoveis.length === 0 ? (
          <EmptyState icon={Building2} title="Nenhum imóvel encontrado"
            description="Cadastre o primeiro imóvel da carteira"
            action={permissoes.cadastrarImoveis ? (
              <Button onClick={abrirCadastro} className="bg-yellow-400 hover:bg-yellow-500 text-gray-900">
                <Plus className="mr-2 h-4 w-4" /> Novo Imóvel
              </Button>
            ) : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Exclusivo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imoveis.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.tipo}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{i.categoria === "URBANO" ? "Urbano" : "Rural"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{i.localizacao || "-"}</TableCell>
                  <TableCell>{i.cliente.nome}</TableCell>
                  <TableCell>{formatValor(i.valor)}</TableCell>
                  <TableCell>
                    <StatusBadge status={i.status === "DISPONIVEL" ? "DISPONIVEL" : "VENDIDO"} />
                  </TableCell>
                  <TableCell>
                    {i.exclusividade ? (
                      <Badge className="bg-yellow-100 text-yellow-800">Sim</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Não</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/imoveis/${i.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
                        <Eye className="h-4 w-4" />
                      </Link>
                      {permissoes.cadastrarImoveis && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => abrirEdicao(i)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setDeleteId(i.id)}>
                            <Trash2 className="h-4 w-4" />
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

      {/* Dialog cadastro/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              {/* Proprietário */}
              <div className="col-span-2 space-y-1.5">
                <Label>Proprietário *</Label>
                <Select value={form.clienteId} onValueChange={(v) => setForm((f) => ({ ...f, clienteId: v }))}>
                  <SelectTrigger aria-invalid={!!erros.clienteId}><SelectValue placeholder="Selecione o proprietário" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                {erros.clienteId && <p className="text-sm text-red-500">{erros.clienteId}</p>}
              </div>

              {/* Corretor/Captador */}
              <div className="col-span-2 space-y-1.5">
                <Label>Corretor / Captador</Label>
                <Select value={form.corretorId || "nenhum"} onValueChange={(v) => setForm((f) => ({ ...f, corretorId: v === "nenhum" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o corretor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Categoria */}
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v as "URBANO" | "RURAL", tipo: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RURAL">Rural</SelectItem>
                    <SelectItem value="URBANO">Urbano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger aria-invalid={!!erros.tipo}><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {tiposDisponiveis.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {erros.tipo && <p className="text-sm text-red-500">{erros.tipo}</p>}
              </div>

              {/* Valor */}
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="text" inputMode="numeric" placeholder="0,00"
                  value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: formatarInputMoeda(e.target.value) }))} />
              </div>

              {/* Data captação */}
              <div className="space-y-1.5">
                <Label>Data de captação</Label>
                <Input type="date" value={form.dataCaptacao}
                  onChange={(e) => setForm((f) => ({ ...f, dataCaptacao: e.target.value }))} />
              </div>

              {/* Exclusividade */}
              <div className="col-span-2 flex items-center gap-3 rounded-lg border px-4 py-3">
                <input type="checkbox" id="exclusividade" checked={form.exclusividade}
                  onChange={(e) => setForm((f) => ({ ...f, exclusividade: e.target.checked }))}
                  className="h-4 w-4" />
                <div>
                  <label htmlFor="exclusividade" className="text-sm font-medium cursor-pointer">Exclusividade</label>
                  <p className="text-xs text-muted-foreground">Imóvel com contrato de exclusividade</p>
                </div>
              </div>

              {/* Endereço urbano + área m² */}
              {form.categoria === "URBANO" && (
                <>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Endereço</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">CEP</Label>
                        <div className="relative">
                          <Input placeholder="00000-000" maxLength={9}
                            value={form.cep} onChange={(e) => handleCepChange(e.target.value)} />
                          {cepLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Área (m²)</Label>
                        <Input type="number" min={0} step={0.01} placeholder="0,00"
                          value={form.areaM2} onChange={(e) => setForm((f) => ({ ...f, areaM2: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Rua</Label>
                        <Input placeholder="Logradouro"
                          value={form.rua} onChange={(e) => setForm((f) => ({ ...f, rua: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Número</Label>
                        <Input placeholder="Nº"
                          value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Bairro</Label>
                        <Input placeholder="Bairro"
                          value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cidade</Label>
                        <Input placeholder="Cidade"
                          value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Estado</Label>
                        <Input placeholder="UF" maxLength={2}
                          value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value.toUpperCase() }))} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Localização complementar */}
              <div className="col-span-2 space-y-1.5">
                <Label>Localização / Referência</Label>
                <Input placeholder="Ponto de referência, condomínio, etc."
                  value={form.localizacao} onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))} />
              </div>

              {/* Áreas — só para Rural */}
              {form.categoria === "RURAL" && (
                <>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Áreas (hectares)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "areaTotal", label: "Área total" },
                        { key: "areaUtil", label: "Área útil (produtiva)" },
                        { key: "areaReservaLegal", label: "Reserva legal" },
                        { key: "areaApp", label: "APP" },
                        { key: "areaAberta", label: "Área aberta" },
                        { key: "areaMata", label: "Mata nativa" },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1.5">
                          <Label className="text-xs">{label}</Label>
                          <Input type="number" min={0} step={0.01} placeholder="0,00"
                            value={form[key as keyof typeof form] as string}
                            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Observações */}
              <div className="col-span-2 space-y-1.5">
                <Label>Observações</Label>
                <Textarea rows={3} value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editando ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imóvel?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o imóvel e todo o seu histórico de visitas e interessados.
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
