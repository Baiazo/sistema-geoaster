"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Users,
  Home,
  FileText,
  FileSignature,
  FolderOpen,
  Settings,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  BarChart2,
  UsersRound,
  X,
  ShieldAlert,
  ArrowLeftRight,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Permissoes } from "@/lib/permissoes";
import { SETOR_CONFIG } from "@/lib/setores";
import type { Setor } from "@/lib/setores";

type NavPermissao = keyof Permissoes | null;

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  permissao: NavPermissao;
  apenasSetor?: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home, permissao: null },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, permissao: "verClientes" },
  { href: "/dashboard/propriedades", label: "Propriedades", icon: MapPin, permissao: "verPropriedades" },
  { href: "/dashboard/orcamentos", label: "Orçamentos", icon: FileSignature, permissao: "verOrcamentos" },
  { href: "/dashboard/processos", label: "Processos", icon: FileText, permissao: "verProcessos" },
  { href: "/dashboard/documentos", label: "Documentos", icon: FolderOpen, permissao: "verDocumentos" },
  { href: "/dashboard/imoveis", label: "Imóveis", icon: Building2, permissao: "verImoveis", apenasSetor: "IMOVEIS" },
];

interface SidebarProps {
  usuario: { nome: string; email: string; perfilAcesso: string };
  permissoes: Permissoes;
  setorAtivo: Setor;
  setores: Setor[];
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ usuario, permissoes, setorAtivo, setores, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const cfg = SETOR_CONFIG[setorAtivo];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Saiu com sucesso");
    router.push("/login");
    router.refresh();
  }

  async function handleTrocarSetor() {
    // Limpa setorAtivo do JWT redirecionando para /setor via API
    // Reutilizamos a página /setor para escolher novamente
    // Para isso, chamamos um token sem setorAtivo: basta ir para /setor
    // mas o proxy só redireciona se setorAtivo for null.
    // Solução: POST /api/auth/setor com setor vazio para limpar, então redirecionar.
    // Mais simples: redirecionar direto para /setor (o proxy não bloqueia se já estiver lá).
    router.push("/setor");
  }

  function handleNavClick() {
    onClose?.();
  }

  return (
    <aside
      className={cn(
        "flex flex-col w-64 bg-gray-900 text-white",
        "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:static md:translate-x-0 md:transition-none md:z-auto"
      )}
    >
      {/* Header: setor ativo */}
      <div className="relative flex flex-col items-center justify-center px-4 py-4 border-b border-gray-700 gap-2">
        <Image
          src={cfg.logoBranco}
          alt={cfg.label}
          width={140}
          height={40}
          className="object-contain max-h-10"
          style={cfg.logoSidebarFilter ? { filter: cfg.logoSidebarFilter } : undefined}
          priority
        />
        <button
          onClick={onClose}
          className="md:hidden absolute right-4 top-4 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems
          .filter(({ permissao, apenasSetor }) =>
            (!permissao || permissoes[permissao]) &&
            (!apenasSetor || setorAtivo === apenasSetor)
          )
          .map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  active
                    ? cn(cfg.activeBg, cfg.activeText, "shadow-sm")
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
                {active && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            );
          })}

        {usuario.perfilAcesso === "ADMIN" && (
          <>
            <Link
              href="/dashboard/usuarios"
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                pathname.startsWith("/dashboard/usuarios")
                  ? cn(cfg.activeBg, cfg.activeText, "shadow-sm")
                  : "text-gray-400 hover:bg-gray-700 hover:text-white"
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>Usuários</span>
            </Link>
            <Link
              href="/dashboard/gestao"
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                pathname.startsWith("/dashboard/gestao")
                  ? cn(cfg.activeBg, cfg.activeText, "shadow-sm")
                  : "text-gray-400 hover:bg-gray-700 hover:text-white"
              )}
            >
              <BarChart2 className="h-4 w-4 shrink-0" />
              <span>Gestão</span>
            </Link>
          </>
        )}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-700 pt-4 space-y-1">
        {/* Trocar setor (só se tiver acesso a mais de 1) */}
        {setores.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTrocarSetor}
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-150"
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Trocar setor
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-150"
        >
          {theme === "dark" ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </Button>

        <div className="px-3 py-2">
          <p className="text-sm font-medium text-white truncate">{usuario.nome}</p>
          <p className="text-xs text-gray-400 truncate">{usuario.email}</p>
          <span className={cn(
            "inline-block mt-1 text-xs px-2 py-0.5 rounded-full",
            cfg.badgeBg, cfg.badgeText
          )}>
            {usuario.perfilAcesso === "ADMIN" ? "Administrador" : "Usuário"}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-150"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
