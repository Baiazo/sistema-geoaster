import type { jsPDF } from "jspdf";

export interface OrcamentoPdfData {
  protocolo: string;
  tipoServico: string;
  status: string;
  descricao?: string | null;
  valor?: number | null;
  condicoesPagamento?: string | null;
  prazoExecucaoDias?: number | null;
  validadeAte?: string | Date | null;
  observacoes?: string | null;
  createdAt: string | Date;
  setor?: string | null;
  atividades?: string[] | null;
  cliente: {
    nome: string;
    cpfCnpj: string;
    telefone?: string | null;
    email?: string | null;
    cidade?: string | null;
    endereco?: string | null;
  };
  propriedade?: {
    nome: string;
    municipio: string;
    uf?: string | null;
    area?: number | null;
    matricula?: string | null;
    car?: string | null;
  } | null;
}

const PAGE_MARGIN = 18;
const LINE_HEIGHT = 6;

function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "A combinar";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string | Date | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR");
}

const MESES_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatarDataExtenso(data: Date): string {
  return `${data.getDate()} de ${MESES_EXTENSO[data.getMonth()]} de ${data.getFullYear()}`;
}

const NUMEROS_EXTENSO: Record<number, string> = {
  1: "um", 2: "dois", 3: "três", 4: "quatro", 5: "cinco",
  6: "seis", 7: "sete", 8: "oito", 9: "nove", 10: "dez",
  11: "onze", 12: "doze", 15: "quinze", 18: "dezoito", 24: "vinte e quatro",
};

function formatarPrazoExtenso(dias: number): string {
  if (dias % 30 === 0) {
    const meses = dias / 30;
    const ext = NUMEROS_EXTENSO[meses] ?? String(meses);
    const num = String(meses).padStart(2, "0");
    return `(${num}) ${ext} ${meses === 1 ? "mês" : "meses"}`;
  }
  if (dias % 7 === 0) {
    const semanas = dias / 7;
    const ext = NUMEROS_EXTENSO[semanas] ?? String(semanas);
    const num = String(semanas).padStart(2, "0");
    return `(${num}) ${ext} ${semanas === 1 ? "semana" : "semanas"}`;
  }
  const ext = NUMEROS_EXTENSO[dias] ?? String(dias);
  const num = String(dias).padStart(2, "0");
  return `(${num}) ${ext} dia${dias === 1 ? "" : "s"}`;
}

async function carregarImagem(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Layout GEO ───────────────────────────────────────────────────────────────

async function gerarOrcamentoPdfGeo(dados: OrcamentoPdfData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const ML = PAGE_MARGIN;
  const MR = PAGE_MARGIN;
  const CW = PW - ML - MR; // 174mm

  // Colunas da tabela
  const COL_ITEM = 16;
  const COL_VALOR = 34;
  const COL_ATIV = CW - COL_ITEM - COL_VALOR;
  const ATIV_TEXT_W = COL_ATIV - 6;

  const CELL_PAD = 2.5;
  const LH = 5;

  // Logo topo-direita
  const logoBase64 = await carregarImagem("/logo-geoaster.png");
  const LOGO_W = 58;
  const LOGO_H = 18;
  if (logoBase64) {
    pdf.addImage(logoBase64, "PNG", PW - MR - LOGO_W, 8, LOGO_W, LOGO_H);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text("GEOASTER", PW - MR, 16, { align: "right" });
  }

  pdf.setTextColor(20, 20, 20);

  // "Para / nome"
  let y = 33;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Para", ML, y);
  y += LH;
  pdf.text(dados.cliente.nome, ML, y);
  y += LH + 5;

  // Título centralizado com sublinhado
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  const titulo = "ORÇAMENTO DE SERVIÇOS TÉCNICOS";
  pdf.text(titulo, PW / 2, y, { align: "center" });
  const tituloW = (pdf.getStringUnitWidth(titulo) * 12) / pdf.internal.scaleFactor;
  pdf.setLineWidth(0.4);
  pdf.setDrawColor(20, 20, 20);
  pdf.line(PW / 2 - tituloW / 2, y + 1, PW / 2 + tituloW / 2, y + 1);
  y += LH + 3;

  // Subtítulo: Matrícula e Área
  if (dados.propriedade) {
    const partes: string[] = [];
    if (dados.propriedade.matricula)
      partes.push(`MATRÍCULA ${dados.propriedade.matricula}`);
    if (dados.propriedade.area)
      partes.push(`Área Registrada ${dados.propriedade.area.toLocaleString("pt-BR")} m²`);
    if (partes.length > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(partes.join(" – "), PW / 2, y, { align: "center" });
      y += LH + 2;
    }
  }
  y += 2;

  // ── Tabela de atividades ──────────────────────────────────────────────────
  const colXItem = ML;
  const colXAtiv = ML + COL_ITEM;
  const colXValor = ML + COL_ITEM + COL_ATIV;

  const HEADER_H = 13;
  const atividades = dados.atividades ?? [];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const alturaLinhas = atividades.map((desc) => {
    const linhas = pdf.splitTextToSize(desc, ATIV_TEXT_W) as string[];
    return Math.max(10, linhas.length * LH + CELL_PAD * 2);
  });

  const tabelaDadosH = alturaLinhas.reduce((a, b) => a + b, 0);
  const tabelaH = HEADER_H + tabelaDadosH;
  const tabelaY = y;

  // Borda externa
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.4);
  pdf.rect(colXItem, tabelaY, CW, tabelaH);

  // Divisórias verticais (altura total)
  pdf.line(colXAtiv, tabelaY, colXAtiv, tabelaY + tabelaH);
  pdf.line(colXValor, tabelaY, colXValor, tabelaY + tabelaH);

  // Borda inferior do cabeçalho
  pdf.setLineWidth(0.5);
  pdf.line(colXItem, tabelaY + HEADER_H, colXItem + CW, tabelaY + HEADER_H);
  pdf.setLineWidth(0.3);

  // Textos do cabeçalho
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text("ITEM", colXItem + COL_ITEM / 2, tabelaY + 8, { align: "center" });
  pdf.text("ATIVIDADES", colXAtiv + COL_ATIV / 2, tabelaY + 8, { align: "center" });
  pdf.text("VALOR", colXValor + COL_VALOR / 2, tabelaY + 5.5, { align: "center" });
  pdf.text("TOTAL", colXValor + COL_VALOR / 2, tabelaY + 10, { align: "center" });

  // Linhas de atividades
  let rowY = tabelaY + HEADER_H;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(20, 20, 20);

  atividades.forEach((desc, i) => {
    const h = alturaLinhas[i];

    // Divisória horizontal entre linhas (só nas colunas ITEM e ATIVIDADES)
    if (i < atividades.length - 1) {
      pdf.setLineWidth(0.3);
      pdf.line(colXItem, rowY + h, colXValor, rowY + h);
    }

    // Número do item (centralizado)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(String(i + 1), colXItem + COL_ITEM / 2, rowY + h / 2 + 1.5, {
      align: "center",
    });

    // Descrição da atividade (centralizada verticalmente, com padding)
    const linhas = pdf.splitTextToSize(desc, ATIV_TEXT_W) as string[];
    const textH = linhas.length * LH;
    const textY = rowY + (h - textH) / 2 + LH - 1;
    pdf.text(linhas, colXAtiv + 3, textY);

    rowY += h;
  });

  // Valor total — célula mesclada (centralizado verticalmente)
  const valorFormatado = formatarMoeda(dados.valor);
  const [prefixoValor, ...restoValor] = valorFormatado.split(" ");
  const numeroValor = restoValor.join(" ");
  const mergedMidY = tabelaY + HEADER_H + tabelaDadosH / 2;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(prefixoValor, colXValor + COL_VALOR / 2, mergedMidY - 2, {
    align: "center",
  });
  pdf.setFontSize(14);
  pdf.text(numeroValor || valorFormatado, colXValor + COL_VALOR / 2, mergedMidY + 5, {
    align: "center",
  });

  y = tabelaY + tabelaH + 8;
  pdf.setTextColor(20, 20, 20);

  // ── Serviços cobertos ─────────────────────────────────────────────────────
  const SERVICOS_COBERTOS =
    "Todos os custos de deslocamento de pessoal, estadias, trabalho técnico, " +
    "ART, montagem de processo, coleta de assinaturas, fornecimento de mapas e " +
    "arquivos digitais.";

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Serviços cobertos pelos valores acima:", ML, y);
  y += LH;
  pdf.setFont("helvetica", "normal");
  const linhasServicos = pdf.splitTextToSize(
    "        " + SERVICOS_COBERTOS,
    CW
  ) as string[];
  pdf.text(linhasServicos, ML, y);
  y += linhasServicos.length * LH + 5;

  // ── Forma de pagamento ────────────────────────────────────────────────────
  if (dados.condicoesPagamento) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Forma de pagamento:", ML, y);
    y += LH;

    const bullets = dados.condicoesPagamento
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean);

    pdf.setFont("helvetica", "normal");
    bullets.forEach((bullet) => {
      const linhas = pdf.splitTextToSize("• " + bullet, CW - 8) as string[];
      pdf.text(linhas, ML + 8, y);
      y += linhas.length * LH;
    });
    y += 5;
  }

  // ── Prazo ─────────────────────────────────────────────────────────────────
  if (dados.prazoExecucaoDias) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("Prazo para a execução:", ML, y);
    y += LH;

    const prazoStr = formatarPrazoExtenso(dados.prazoExecucaoDias);
    const prazoTexto =
      "        O prazo para a execução dos trabalhos é de " +
      prazoStr +
      ", após início de trabalho de campo.";

    pdf.setFont("helvetica", "normal");
    const linhasPrazo = pdf.splitTextToSize(prazoTexto, CW) as string[];
    pdf.text(linhasPrazo, ML, y);
    y += linhasPrazo.length * LH + 5;
  }

  // ── Observação ────────────────────────────────────────────────────────────
  if (dados.observacoes) {
    const obsLabel = "Observação: ";
    const obsLabelW =
      (pdf.getStringUnitWidth(obsLabel) * 10) / pdf.internal.scaleFactor;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(obsLabel, ML, y);

    pdf.setFont("helvetica", "normal");
    const obsLinhas = pdf.splitTextToSize(
      dados.observacoes,
      CW - obsLabelW
    ) as string[];
    pdf.text(obsLinhas[0], ML + obsLabelW, y);
    for (let i = 1; i < obsLinhas.length; i++) {
      y += LH;
      pdf.text(obsLinhas[i], ML, y);
    }
    y += LH + 6;
  }

  // ── Assinatura ────────────────────────────────────────────────────────────
  const dataStr =
    "Caçador/SC, " +
    formatarDataExtenso(
      typeof dados.createdAt === "string"
        ? new Date(dados.createdAt)
        : dados.createdAt
    ) +
    ".";

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(dataStr, PW / 2, y, { align: "center" });
  y += LH * 3;

  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(0.3);
  const sigW = 70;
  pdf.line(PW / 2 - sigW / 2, y, PW / 2 + sigW / 2, y);
  y += LH;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Geoaster Assessoria Agrária Ltda", PW / 2, y, { align: "center" });
  y += LH;
  pdf.text("CNPJ: 09.212.997/0001-18", PW / 2, y, { align: "center" });

  // ── Rodapé ────────────────────────────────────────────────────────────────
  const FOOTER_Y = PH - 36;

  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(ML, FOOTER_Y, PW - MR, FOOTER_Y);

  // Logo rodapé
  if (logoBase64) {
    pdf.addImage(logoBase64, "PNG", ML, FOOTER_Y + 4, 52, 16);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(60, 60, 60);
  const addrX = ML + 56;
  pdf.text(
    "Rua Henrique Julio Berger, 855 - Bairro Berger - CEP 89.500-386 - Caçador - SC",
    addrX,
    FOOTER_Y + 8
  );
  pdf.text("Fone: (49) 3567.9957", addrX, FOOTER_Y + 13);
  pdf.setFont("helvetica", "normal");
  pdf.text("www.geoaster.com.br", addrX, FOOTER_Y + 18);
  pdf.text("e-mail: geoaster@hotmail.com", addrX, FOOTER_Y + 23);

  pdf.save(`orcamento-${dados.protocolo}.pdf`);
}

// ── Layout padrão (outros setores) ───────────────────────────────────────────

function escreverLinha(
  pdf: jsPDF,
  label: string,
  valor: string,
  y: number,
  larguraPagina: number
): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(label, PAGE_MARGIN, y);
  pdf.setFont("helvetica", "normal");
  const valorX = PAGE_MARGIN + 50;
  const larguraDisponivel = larguraPagina - valorX - PAGE_MARGIN;
  const linhas = pdf.splitTextToSize(valor || "—", larguraDisponivel) as string[];
  pdf.text(linhas, valorX, y);
  return y + LINE_HEIGHT * linhas.length;
}

function escreverBloco(
  pdf: jsPDF,
  titulo: string,
  texto: string,
  y: number,
  larguraPagina: number
): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(titulo, PAGE_MARGIN, y);
  y += LINE_HEIGHT;
  pdf.setFont("helvetica", "normal");
  const linhas = pdf.splitTextToSize(
    texto,
    larguraPagina - PAGE_MARGIN * 2
  ) as string[];
  pdf.text(linhas, PAGE_MARGIN, y);
  return y + LINE_HEIGHT * linhas.length + 2;
}

function secaoTitulo(
  pdf: jsPDF,
  texto: string,
  y: number,
  larguraPagina: number
): number {
  pdf.setFillColor(14, 165, 233);
  pdf.rect(PAGE_MARGIN, y, larguraPagina - PAGE_MARGIN * 2, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(texto, PAGE_MARGIN + 3, y + 5);
  pdf.setTextColor(20, 20, 20);
  return y + 11;
}

async function gerarOrcamentoPdfPadrao(dados: OrcamentoPdfData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const larguraPagina = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(14, 165, 233);
  pdf.rect(0, 0, larguraPagina, 24, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("GEOASTER", PAGE_MARGIN, 12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Proposta de orçamento", PAGE_MARGIN, 18);

  pdf.setFontSize(10);
  pdf.text(
    `Protocolo: ${dados.protocolo}`,
    larguraPagina - PAGE_MARGIN,
    12,
    { align: "right" }
  );
  pdf.text(
    `Emitido em: ${formatarData(dados.createdAt)}`,
    larguraPagina - PAGE_MARGIN,
    18,
    { align: "right" }
  );

  pdf.setTextColor(20, 20, 20);
  let y = 34;

  y = secaoTitulo(pdf, "Cliente", y, larguraPagina);
  y = escreverLinha(pdf, "Nome:", dados.cliente.nome, y, larguraPagina);
  y = escreverLinha(pdf, "CPF/CNPJ:", dados.cliente.cpfCnpj, y, larguraPagina);
  if (dados.cliente.telefone)
    y = escreverLinha(pdf, "Telefone:", dados.cliente.telefone, y, larguraPagina);
  if (dados.cliente.email)
    y = escreverLinha(pdf, "E-mail:", dados.cliente.email, y, larguraPagina);
  if (dados.cliente.cidade)
    y = escreverLinha(pdf, "Cidade:", dados.cliente.cidade, y, larguraPagina);
  if (dados.cliente.endereco)
    y = escreverLinha(pdf, "Endereço:", dados.cliente.endereco, y, larguraPagina);
  y += 3;

  if (dados.propriedade) {
    y = secaoTitulo(pdf, "Propriedade", y, larguraPagina);
    y = escreverLinha(pdf, "Nome:", dados.propriedade.nome, y, larguraPagina);
    y = escreverLinha(
      pdf,
      "Município:",
      `${dados.propriedade.municipio}${dados.propriedade.uf ? " / " + dados.propriedade.uf : ""}`,
      y,
      larguraPagina
    );
    if (dados.propriedade.area)
      y = escreverLinha(
        pdf,
        "Área:",
        `${dados.propriedade.area.toLocaleString("pt-BR")} ha`,
        y,
        larguraPagina
      );
    if (dados.propriedade.matricula)
      y = escreverLinha(pdf, "Matrícula:", dados.propriedade.matricula, y, larguraPagina);
    if (dados.propriedade.car)
      y = escreverLinha(pdf, "CAR:", dados.propriedade.car, y, larguraPagina);
    y += 3;
  }

  y = secaoTitulo(pdf, "Serviço proposto", y, larguraPagina);
  y = escreverLinha(pdf, "Tipo de serviço:", dados.tipoServico, y, larguraPagina);
  if (dados.descricao)
    y = escreverBloco(pdf, "Descrição / escopo:", dados.descricao, y, larguraPagina);
  y += 1;

  y = secaoTitulo(pdf, "Condições comerciais", y, larguraPagina);
  y = escreverLinha(pdf, "Valor total:", formatarMoeda(dados.valor), y, larguraPagina);
  if (dados.condicoesPagamento)
    y = escreverLinha(pdf, "Pagamento:", dados.condicoesPagamento, y, larguraPagina);
  if (dados.prazoExecucaoDias)
    y = escreverLinha(
      pdf,
      "Prazo de execução:",
      `${dados.prazoExecucaoDias} dia(s)`,
      y,
      larguraPagina
    );
  if (dados.validadeAte)
    y = escreverLinha(
      pdf,
      "Proposta válida até:",
      formatarData(dados.validadeAte),
      y,
      larguraPagina
    );
  y += 3;

  if (dados.observacoes) {
    y = secaoTitulo(pdf, "Observações", y, larguraPagina);
    y = escreverBloco(pdf, "", dados.observacoes, y, larguraPagina);
  }

  const alturaPagina = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(200);
  pdf.line(
    PAGE_MARGIN,
    alturaPagina - 20,
    larguraPagina - PAGE_MARGIN,
    alturaPagina - 20
  );
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    "Este documento é uma proposta comercial. A aprovação converte automaticamente em processo de trabalho.",
    larguraPagina / 2,
    alturaPagina - 12,
    { align: "center" }
  );
  pdf.text(
    `Geoaster · ${dados.protocolo}`,
    larguraPagina / 2,
    alturaPagina - 7,
    { align: "center" }
  );

  pdf.save(`orcamento-${dados.protocolo}.pdf`);
}

// ── Exportação principal ──────────────────────────────────────────────────────

export async function gerarOrcamentoPdf(dados: OrcamentoPdfData): Promise<void> {
  if (dados.setor === "GEO" && dados.atividades && dados.atividades.length > 0) {
    return gerarOrcamentoPdfGeo(dados);
  }
  return gerarOrcamentoPdfPadrao(dados);
}
