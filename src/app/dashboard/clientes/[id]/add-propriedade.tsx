"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Paperclip, CheckCircle2 } from "lucide-react";
import { buscarCep, formatarCep } from "@/lib/cep";

const empty = { nome: "", cep: "", municipio: "", uf: "", area: "", matricula: "", car: "", ccir: "", coordenadas: "" };

type DocField = "matricula" | "car" | "ccir" | "mapa";
type FilesState = Record<DocField, File | null>;
type UploadedState = Record<DocField, boolean>;

const emptyFiles: FilesState = { matricula: null, car: null, ccir: null, mapa: null };
const emptyUploaded: UploadedState = { matricula: false, car: false, ccir: false, mapa: false };

const docLabels: Record<DocField, string> = { matricula: "Matrícula", car: "CAR", ccir: "CCIR", mapa: "Mapa" };

interface UploadBtnProps {
  field: DocField;
  file: File | null;
  uploaded: boolean;
  onChange: (field: DocField, file: File | null) => void;
}

function UploadBtn({ field, file, uploaded, onChange }: UploadBtnProps) {
  return (
    <label
      htmlFor={`file-${field}`}
      className="cursor-pointer flex items-center justify-center w-9 h-9 rounded-md border border-input hover:bg-muted transition-colors shrink-0"
      title={file ? file.name : `Anexar ${docLabels[field]}`}
    >
      {uploaded ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : file ? (
        <Paperclip className="h-4 w-4 text-sky-500" />
      ) : (
        <Paperclip className="h-4 w-4 text-muted-foreground" />
      )}
      <input
        id={`file-${field}`}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        className="sr-only"
        onChange={(e) => {
          onChange(field, e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function AddPropriedade({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [files, setFiles] = useState<FilesState>(emptyFiles);
  const [uploaded, setUploaded] = useState<UploadedState>(emptyUploaded);

  function handleFileChange(field: DocField, file: File | null) {
    setFiles((f) => ({ ...f, [field]: file }));
    setUploaded((u) => ({ ...u, [field]: false }));
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

  function validar() {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Nome é obrigatório";
    if (!form.municipio.trim()) e.municipio = "Município é obrigatório";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function uploadDoc(field: DocField, propriedadeId: string) {
    const file = files[field];
    if (!file) return;
    const fd = new FormData();
    fd.append("arquivo", file);
    fd.append("tipo", docLabels[field]);
    fd.append("propriedadeId", propriedadeId);
    fd.append("clienteId", clienteId);
    const res = await fetch("/api/documentos", { method: "POST", body: fd });
    if (res.ok) setUploaded((u) => ({ ...u, [field]: true }));
    else toast.error(`Erro ao enviar arquivo de ${docLabels[field]}`);
  }

  async function handleSalvar(ev: { preventDefault(): void }) {
    ev.preventDefault();
    if (!validar()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/propriedades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clienteId,
          area: form.area ? parseFloat(form.area) : null,
          cep: form.cep || null,
          uf: form.uf || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }

      await Promise.all((["matricula", "car", "ccir", "mapa"] as DocField[]).map((f) => uploadDoc(f, data.id)));

      toast.success("Propriedade cadastrada!");
      setOpen(false);
      setForm(empty);
      setFiles(emptyFiles);
      setUploaded(emptyUploaded);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function handleOpen() {
    setForm(empty);
    setErros({});
    setFiles(emptyFiles);
    setUploaded(emptyUploaded);
    setOpen(true);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Propriedade</DialogTitle></DialogHeader>
          <form onSubmit={handleSalvar} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ap-nome">Nome *</Label>
                <Input id="ap-nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} aria-invalid={!!erros.nome} />
                {erros.nome && <p className="text-sm text-red-500">{erros.nome}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ap-cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="ap-cep"
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
                <Label htmlFor="ap-municipio">Município *</Label>
                <Input id="ap-municipio" value={form.municipio} onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))} aria-invalid={!!erros.municipio} />
                {erros.municipio && <p className="text-sm text-red-500">{erros.municipio}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-uf">UF</Label>
                <Input id="ap-uf" placeholder="SP" value={form.uf} onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))} maxLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-area">Área (ha)</Label>
                <Input id="ap-area" type="number" step="0.01" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-matricula">Matrícula</Label>
                <div className="flex items-center gap-1.5">
                  <Input id="ap-matricula" value={form.matricula} onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))} />
                  <UploadBtn field="matricula" file={files.matricula} uploaded={uploaded.matricula} onChange={handleFileChange} />
                </div>
                {files.matricula && !uploaded.matricula && (
                  <p className="text-xs text-muted-foreground truncate">{files.matricula.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-car">CAR</Label>
                <div className="flex items-center gap-1.5">
                  <Input id="ap-car" value={form.car} onChange={(e) => setForm((f) => ({ ...f, car: e.target.value }))} />
                  <UploadBtn field="car" file={files.car} uploaded={uploaded.car} onChange={handleFileChange} />
                </div>
                {files.car && !uploaded.car && (
                  <p className="text-xs text-muted-foreground truncate">{files.car.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-ccir">CCIR</Label>
                <div className="flex items-center gap-1.5">
                  <Input id="ap-ccir" value={form.ccir} onChange={(e) => setForm((f) => ({ ...f, ccir: e.target.value }))} />
                  <UploadBtn field="ccir" file={files.ccir} uploaded={uploaded.ccir} onChange={handleFileChange} />
                </div>
                {files.ccir && !uploaded.ccir && (
                  <p className="text-xs text-muted-foreground truncate">{files.ccir.name}</p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ap-coord">Coordenadas</Label>
                <Input id="ap-coord" value={form.coordenadas} onChange={(e) => setForm((f) => ({ ...f, coordenadas: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Mapa</Label>
                <div className="flex items-center gap-2">
                  <UploadBtn field="mapa" file={files.mapa} uploaded={uploaded.mapa} onChange={handleFileChange} />
                  {files.mapa && !uploaded.mapa && (
                    <span className="text-xs text-muted-foreground truncate max-w-[160px]">{files.mapa.name}</span>
                  )}
                  {uploaded.mapa && (
                    <span className="text-xs text-green-600">Enviado</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cadastrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
