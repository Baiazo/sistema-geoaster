export interface Permissoes {
  verClientes: boolean;
  cadastrarClientes: boolean;
  verPropriedades: boolean;
  cadastrarPropriedades: boolean;
  verDocumentos: boolean;
  cadastrarDocumentos: boolean;
  verProcessos: boolean;
  cadastrarProcessos: boolean;
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
];

export function getPermissoesEfetivas(
  perfilAcesso: string,
  raw?: unknown
): Permissoes {
  if (perfilAcesso === "ADMIN") return { ...PERMISSOES_PADRAO };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...PERMISSOES_PADRAO };
  return { ...PERMISSOES_PADRAO, ...(raw as Partial<Permissoes>) };
}
