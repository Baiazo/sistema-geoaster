"use client";

import { createContext, useContext } from "react";
import { type Permissoes, PERMISSOES_PADRAO } from "@/lib/permissoes";

const PermissoesContext = createContext<Permissoes>(PERMISSOES_PADRAO);

export function usePermissoes(): Permissoes {
  return useContext(PermissoesContext);
}

export function PermissoesProvider({
  permissoes,
  children,
}: {
  permissoes: Permissoes;
  children: React.ReactNode;
}) {
  return (
    <PermissoesContext.Provider value={permissoes}>
      {children}
    </PermissoesContext.Provider>
  );
}
