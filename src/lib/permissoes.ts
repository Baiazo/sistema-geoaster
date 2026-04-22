export interface Permissoes {
  verClientes: boolean;
  cadastrarClientes: boolean;
  verPropriedades: boolean;
  cadastrarPropriedades: boolean;
  verDocumentos: boolean;
  cadastrarDocumentos: boolean;
  verProcessos: boolean;
  cadastrarProcessos: boolean;
  verOrcamentos: boolean;
  cadastrarOrcamentos: boolean;
  verColaboradores: boolean;
  cadastrarColaboradores: boolean;
  verEquipes: boolean;
  cadastrarEquipes: boolean;
  verImoveis: boolean;
  cadastrarImoveis: boolean;
}

export const PERMISSOES_PADRAO: Permissoes = {
  verClientes: true,
  cadastrarClientes: true,
  verPropriedades: true,
  cadastrarPropriedades: true,
  verDocumentos: true,
  cadastrarDocumentos: true,
  verProcessos: true,
  cadastrarProcessos: true,
  verOrcamentos: true,
  cadastrarOrcamentos: true,
  verColaboradores: false,
  cadastrarColaboradores: false,
  verEquipes: false,
  cadastrarEquipes: false,
  verImoveis: false,
  cadastrarImoveis: false,
};

const PERMISSOES_ADMIN: Permissoes = {
  verClientes: true,
  cadastrarClientes: true,
  verPropriedades: true,
  cadastrarPropriedades: true,
  verDocumentos: true,
  cadastrarDocumentos: true,
  verProcessos: true,
  cadastrarProcessos: true,
  verOrcamentos: true,
  cadastrarOrcamentos: true,
  verColaboradores: true,
  cadastrarColaboradores: true,
  verEquipes: true,
  cadastrarEquipes: true,
  verImoveis: true,
  cadastrarImoveis: true,
};

export const GRUPOS_PERMISSOES: Array<{
  modulo: string;
  permissoes: Array<{ chave: keyof Permissoes; label: string }>;
}> = [
  {
    modulo: "Clientes",
    permissoes: [
      { chave: "verClientes", label: "Ver clientes" },
      { chave: "cadastrarClientes", label: "Cadastrar / editar / excluir clientes" },
    ],
  },
  {
    modulo: "Propriedades",
    permissoes: [
      { chave: "verPropriedades", label: "Ver propriedades" },
      { chave: "cadastrarPropriedades", label: "Cadastrar / editar / excluir propriedades" },
    ],
  },
  {
    modulo: "Documentos",
    permissoes: [
      { chave: "verDocumentos", label: "Ver documentos" },
      { chave: "cadastrarDocumentos", label: "Enviar / excluir documentos" },
    ],
  },
  {
    modulo: "Processos",
    permissoes: [
      { chave: "verProcessos", label: "Ver processos" },
      { chave: "cadastrarProcessos", label: "Criar / atualizar processos" },
    ],
  },
  {
    modulo: "Orçamentos",
    permissoes: [
      { chave: "verOrcamentos", label: "Ver orçamentos" },
      { chave: "cadastrarOrcamentos", label: "Criar / editar / aprovar orçamentos" },
    ],
  },
  {
    modulo: "Colaboradores",
    permissoes: [
      { chave: "verColaboradores", label: "Ver colaboradores" },
      { chave: "cadastrarColaboradores", label: "Cadastrar / editar / excluir colaboradores" },
    ],
  },
  {
    modulo: "Equipes",
    permissoes: [
      { chave: "verEquipes", label: "Ver equipes" },
      { chave: "cadastrarEquipes", label: "Cadastrar / editar / excluir equipes" },
    ],
  },
  {
    modulo: "Imóveis",
    permissoes: [
      { chave: "verImoveis", label: "Ver imóveis" },
      { chave: "cadastrarImoveis", label: "Cadastrar / editar / excluir imóveis" },
    ],
  },
];

export function getPermissoesEfetivas(
  perfilAcesso: string,
  raw?: unknown
): Permissoes {
  if (perfilAcesso === "ADMIN") return { ...PERMISSOES_ADMIN };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...PERMISSOES_PADRAO };
  return { ...PERMISSOES_PADRAO, ...(raw as Partial<Permissoes>) };
}
