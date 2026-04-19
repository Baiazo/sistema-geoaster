"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import type { Permissoes } from "@/lib/permissoes";

interface DashboardShellProps {
  usuario: { nome: string; email: string; perfilAcesso: string };
  permissoes: Permissoes;
  children: React.ReactNode;
}

export function DashboardShell({ usuario, permissoes, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        usuario={usuario}
        permissoes={permissoes}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Área principal */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header mobile */}
        <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-gray-900 md:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 flex justify-center">
            <Image
              src="/logo-geoaster.png"
              alt="GeoAster"
              width={110}
              height={24}
              className="brightness-0 invert"
              priority
            />
          </div>
          {/* Espaço espelho do botão para centralizar logo */}
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
