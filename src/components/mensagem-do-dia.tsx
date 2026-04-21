"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const MAX_LENGTH = 500;

interface MensagemDoDia {
  id: string;
  conteudo: string;
  ativa: boolean;
  updatedAt: string;
}

export function MensagemDoDiaCard({ conteudo }: { conteudo: string }) {
  return (
    <div className="mb-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-4 motion-safe:duration-700 motion-safe:ease-out">
      <div
        className="relative overflow-hidden rounded-xl border border-sky-200/60 dark:border-sky-900/60 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/40 dark:via-blue-950/40 dark:to-indigo-950/40 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-sky-300/30 dark:bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-300/30 dark:bg-indigo-500/10 blur-3xl" />

        <div className="relative flex items-start gap-3 p-4 sm:p-5">
          <div className="shrink-0 rounded-lg bg-white/70 dark:bg-white/10 p-2 ring-1 ring-sky-200/70 dark:ring-sky-800/50 motion-safe:animate-pulse">
            <Sparkles className="h-5 w-5 text-sky-600 dark:text-sky-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300 mb-1">
              Mensagem do dia
            </p>
            <p className="text-sm sm:text-base text-foreground whitespace-pre-wrap break-words leading-relaxed">
              {conteudo}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditarMensagemDoDiaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mensagemAtual: MensagemDoDia | null;
  onSaved: (mensagem: MensagemDoDia | null) => void;
}

export function EditarMensagemDoDiaDialog({
  open,
  onOpenChange,
  mensagemAtual,
  onSaved,
}: EditarMensagemDoDiaDialogProps) {
  const [conteudo, setConteudo] = useState("");
  const [ativa, setAtiva] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      setConteudo(mensagemAtual?.conteudo ?? "");
      setAtiva(mensagemAtual?.ativa ?? true);
    }
  }, [open, mensagemAtual]);

  async function salvar() {
    if (conteudo.length > MAX_LENGTH) {
      toast.error(`A mensagem não pode ter mais de ${MAX_LENGTH} caracteres`);
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/mensagem-do-dia", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo, ativa }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao salvar");
        return;
      }
      toast.success(
        conteudo.trim().length === 0
          ? "Mensagem do dia removida"
          : "Mensagem do dia atualizada"
      );
      const exibir = data.mensagem && data.mensagem.ativa && data.mensagem.conteudo.trim();
      onSaved(exibir ? data.mensagem : null);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-300" />
            Mensagem do dia
          </DialogTitle>
          <DialogDescription>
            Será exibida na home para todos os usuários. Deixe em branco para remover.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mdd-conteudo">Conteúdo</Label>
            <Textarea
              id="mdd-conteudo"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Ex.: Bom dia, equipe! Lembrem-se da reunião às 14h."
              rows={5}
              maxLength={MAX_LENGTH}
            />
            <p className="text-xs text-muted-foreground text-right">
              {conteudo.length}/{MAX_LENGTH}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex flex-col">
              <Label htmlFor="mdd-ativa" className="cursor-pointer">Exibir no dashboard</Label>
              <span className="text-xs text-muted-foreground">Desative para ocultar sem apagar</span>
            </div>
            <Switch id="mdd-ativa" checked={ativa} onCheckedChange={setAtiva} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
