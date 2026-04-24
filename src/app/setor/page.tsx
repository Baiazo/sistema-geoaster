"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, BarChart3 } from "lucide-react";
import { SETOR_CONFIG, TODOS_SETORES } from "@/lib/setores";
import type { Setor } from "@/lib/setores";
import { cn } from "@/lib/utils";

export default function SetorPage() {
  const [selecionando, setSelecionando] = useState<Setor | "GESTAO" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSetores, setUserSetores] = useState<Setor[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.usuario) {
            setIsAdmin(data.usuario.perfilAcesso === "ADMIN");
            setUserSetores(data.usuario.setores || []);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoadingSession(false);
      }
    }
    fetchSession();
  }, []);

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

  async function irParaGestao() {
    setSelecionando("GESTAO");
    try {
      // Define o primeiro setor disponível como ativo para manter a sessão válida no dashboard
      const setor = userSetores.length > 0 ? userSetores[0] : "GEO";
      const res = await fetch("/api/auth/setor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erro ao acessar gestão");
        return;
      }
      window.location.href = "/dashboard/gestao";
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSelecionando(null);
    }
  }

  const gridCols = isAdmin ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground">Selecione o setor</h1>
          <p className="text-muted-foreground mt-2">Escolha em qual área você quer trabalhar agora</p>
        </div>

        <div className={cn("grid grid-cols-1 gap-6", gridCols)}>
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
                    <>
                      <Image
                        src={cfg.logo}
                        alt={cfg.label}
                        width={160}
                        height={64}
                        className="object-contain max-h-16 dark:hidden"
                      />
                      <Image
                        src={cfg.logoBranco}
                        alt={cfg.label}
                        width={160}
                        height={64}
                        className="object-contain max-h-16 hidden dark:block"
                      />
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">{cfg.descricao}</p>
              </button>
            );
          })}

          {isAdmin && (
            <button
              onClick={irParaGestao}
              disabled={!!selecionando}
              className={cn(
                "group flex flex-col items-center gap-6 p-8 rounded-2xl border-2 transition-all duration-200",
                "bg-card shadow-sm hover:shadow-lg hover:-translate-y-1",
                "border-gray-400",
                "bg-gray-50 dark:bg-gray-900",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
              )}
            >
              <div className="h-16 flex items-center justify-center">
                {selecionando === "GESTAO" ? (
                  <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
                ) : (
                  <BarChart3 className="h-12 w-12 text-gray-500" />
                )}
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">Gestão</p>
                <p className="text-sm text-muted-foreground">Colaboradores, equipes, auditoria e gráficos</p>
              </div>
            </button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Você pode trocar de setor a qualquer momento pelo menu lateral
        </p>
      </div>
    </div>
  );
}
