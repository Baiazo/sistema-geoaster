"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";

const tiposServico = [
  "Georreferenciamento",
  "CAR",
  "Regularização ambiental",
  "Licença ambiental",
  "Emissão de CCIR",
  "Processo INCRA",
  "Mapa de uso e ocupação de solo",
  "Inventário florestal",
  "Outros",
];

interface Propriedade { id: string; nome: string }

export function AddProcesso({ clienteId, propriedades }: { clienteId: string; propriedades: Propriedade[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipoServico: "", propriedadeId: "", observacoes: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validar() {
    const e: Record<string, string> = {};
    if (!form.tipoServico) e.tipoServico = "Selecione o tipo de serviço";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSalvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validar()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/processos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId,
          tipoServico: form.tipoServico,
          propriedadeId: form.propriedadeId || undefined,
          observacoes: form.observacoes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Processo criado!");
      setOpen(false);
      setForm({ tipoServico: "", propriedadeId: "", observacoes: "" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setForm({ tipoServico: "", propriedadeId: "", observacoes: "" }); setErros({}); setOpen(true); }}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Processo</DialogTitle></DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="apc-tipo">Tipo de Serviço *</Label>
              <Select value={form.tipoServico} onValueChange={(v) => setForm((f) => ({ ...f, tipoServico: v ?? "" }))}>
                <SelectTrigger id="apc-tipo" aria-invalid={!!erros.tipoServico}>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {tiposServico.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {erros.tipoServico && <p className="text-sm text-red-500">{erros.tipoServico}</p>}
            </div>
            {propriedades.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="apc-prop">Propriedade (opcional)</Label>
                <Select value={form.propriedadeId} onValueChange={(v) => setForm((f) => ({ ...f, propriedadeId: v ?? "" }))}>
                  <SelectTrigger id="apc-prop"><SelectValue placeholder="Selecione a propriedade" /></SelectTrigger>
                  <SelectContent>
                    {propriedades.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="apc-obs">Observações</Label>
              <Textarea id="apc-obs" rows={3} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
