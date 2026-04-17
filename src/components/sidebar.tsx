"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Users,
  Home,
  FileText,
  FolderOpen,
  Settings,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/propriedades", label: "Propriedades", icon: MapPin },
  { href: "/dashboard/processos", label: "Processos", icon: FileText },
  { href: "/dashboard/documentos", label: "Documentos", icon: FolderOpen },
];

interface SidebarProps {
  usuario: { nome: string; email: string; perfilAcesso: string };
}

export function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Saiu com sucesso");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-900 text-white">
      <div className="flex items-center justify-center px-6 py-5 border-b border-gray-700">
        <Image
          src="/logo-geoaster.png"
          alt="GeoAster"
          width={148}
          height={32}
          className="brightness-0 invert"
          priority
        />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sky-500 text-white shadow-sm"
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
          <Link
            href="/dashboard/usuarios"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              pathname.startsWith("/dashboard/usuarios")
                ? "bg-sky-500 text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Usuários</span>
          </Link>
        )}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-700 pt-4 space-y-1">
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
          <span className="inline-block mt-1 text-xs bg-sky-800 text-sky-200 px-2 py-0.5 rounded-full">
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
