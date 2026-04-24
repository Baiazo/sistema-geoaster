export interface AtividadeGeo {
  label: string;
  descricao: string;
}

export const ATIVIDADES_GEO: Record<string, AtividadeGeo> = {
  georreferenciamento: {
    label: "Georreferenciamento",
    descricao: "Georreferenciar e Certificar o imóvel via INCRA/SIGEF, padrão INCRA.",
  },
  retificacao_matricula: {
    label: "Retificação de matrícula",
    descricao:
      "Retificar matricula, fazer inserção de medidas, regularizar o imóvel junto ao Registro de Imóveis da Comarca.",
  },
  car: {
    label: "CAR",
    descricao: "Cadastro Ambiental Rural (CAR).",
  },
  ccir_cib: {
    label: "CCIR / CIB",
    descricao:
      "Regularizar o CCIR / CIB (para estes necessário certificado digital do titular para acesso ao SNCR / RFB, ou entregue toda documentação necessária para o titular dirigir-se a Unidade de Atendimento INCRA e Receita Federal).",
  },
  regularizacao_ambiental: {
    label: "Regularização ambiental",
    descricao: "Regularização ambiental junto aos órgãos competentes.",
  },
  licenca_ambiental: {
    label: "Licença ambiental",
    descricao: "Obtenção de licença ambiental junto ao órgão competente.",
  },
  processo_incra: {
    label: "Processo INCRA",
    descricao: "Instrução e acompanhamento de processo junto ao INCRA.",
  },
  mapa_uso_solo: {
    label: "Mapa de uso e ocupação de solo",
    descricao: "Elaboração de mapa de uso e ocupação de solo da propriedade.",
  },
  inventario_florestal: {
    label: "Inventário florestal",
    descricao: "Realização de inventário florestal da propriedade.",
  },
  outros: {
    label: "Outros",
    descricao: "Outros serviços técnicos conforme acordado.",
  },
};

export const LISTA_ATIVIDADES_GEO = Object.entries(ATIVIDADES_GEO).map(
  ([key, val]) => ({ key, ...val })
);
