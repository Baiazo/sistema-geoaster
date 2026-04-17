"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Paperclip } from "lucide-react";

const tiposDocumento = ["CAR", "CCIR", "Matrícula", "Licença ambiental", "Contrato", "Outros"];

export function AddDocumento({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validar() {
    const e: Record<string, string> = {};
    if (!arquivo) e.arquivo = "Selecione um arquivo";
    if (!tipo) e.tipo = "Selecione o tipo";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSalvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validar() || !arquivo) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      fd.append("tipo", tipo);
      fd.append("clienteId", clienteId);
      const res = await fetch("/api/documentos", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Documento enviado!");
      setOpen(false);
      setArquivo(null);
      setTipo("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setArquivo(null); setTipo(""); setErros({}); setOpen(true); }}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enviar Documento</DialogTitle></DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="ad-arquivo">Arquivo *</Label>
              <input
                id="ad-arquivo"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-sky-50 file:text-sky-600 hover:file:bg-sky-100"
                onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); if (erros.arquivo) setErros((p) => ({ ...p, arquivo: "" })); }}
                aria-invalid={!!erros.arquivo}
              />
              {arquivo && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> {arquivo.name}
                </p>
              )}
              {erros.arquivo && <p className="text-sm text-red-500">{erros.arquivo}</p>}
              <p className="text-xs text-muted-foreground">PDF, Word, Excel, JPG ou PNG — máx. 20 MB</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v ?? ""); if (erros.tipo) setErros((p) => ({ ...p, tipo: "" })); }}>
                <SelectTrigger id="ad-tipo" aria-invalid={!!erros.tipo}><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {tiposDocumento.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {erros.tipo && <p className="text-sm text-red-500">{erros.tipo}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
