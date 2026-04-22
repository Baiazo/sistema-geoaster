"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SETOR_CONFIG, TODOS_SETORES } from "@/lib/setores";
import type { Setor } from "@/lib/setores";
import { cn } from "@/lib/utils";

export default function SetorPage() {
  const [selecionando, setSelecionando] = useState<Setor | null>(null);

  async function selecionarSetor(setor: Setor) {
    setSelecionando(setor);
    try {
      const res = await fetch("/api/auth/setor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro ao selecionar setor");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSelecionando(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground">Selecione o setor</h1>
          <p className="text-muted-foreground mt-2">Escolha em qual área você quer trabalhar agora</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TODOS_SETORES.map((setor) => {
            const cfg = SETOR_CONFIG[setor];
            const loading = selecionando === setor;

            return (
              <button
                key={setor}
                onClick={() => selecionarSetor(setor)}
                disabled={!!selecionando}
                className={cn(
                  "group flex flex-col items-center gap-6 p-8 rounded-2xl border-2 transition-all duration-200",
                  "bg-card shadow-sm hover:shadow-lg hover:-translate-y-1",
                  cfg.cardBorder,
                  cfg.cardBg,
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                )}
              >
                <div className="h-16 flex items-center justify-center">
                  {loading ? (
                    <Loader2 className={cn("h-10 w-10 animate-spin", cfg.iconColor)} />
                  ) : (
                    <Image
                      src={cfg.logo}
                      alt={cfg.label}
                      width={160}
                      height={64}
                      className="object-contain max-h-16"
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">{cfg.descricao}</p>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Você pode trocar de setor a qualquer momento pelo menu lateral
        </p>
      </div>
    </div>
  );
}
