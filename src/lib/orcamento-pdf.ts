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

function escreverLinha(pdf: jsPDF, label: string, valor: string, y: number, larguraPagina: number): number {
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

function escreverBloco(pdf: jsPDF, titulo: string, texto: string, y: number, larguraPagina: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(titulo, PAGE_MARGIN, y);
  y += LINE_HEIGHT;
  pdf.setFont("helvetica", "normal");
  const linhas = pdf.splitTextToSize(texto, larguraPagina - PAGE_MARGIN * 2) as string[];
  pdf.text(linhas, PAGE_MARGIN, y);
  return y + LINE_HEIGHT * linhas.length + 2;
}

function secaoTitulo(pdf: jsPDF, texto: string, y: number, larguraPagina: number): number {
  pdf.setFillColor(14, 165, 233);
  pdf.rect(PAGE_MARGIN, y, larguraPagina - PAGE_MARGIN * 2, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(texto, PAGE_MARGIN + 3, y + 5);
  pdf.setTextColor(20, 20, 20);
  return y + 11;
}

export async function gerarOrcamentoPdf(dados: OrcamentoPdfData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const larguraPagina = pdf.internal.pageSize.getWidth();

  // Cabeçalho
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
  pdf.text(`Protocolo: ${dados.protocolo}`, larguraPagina - PAGE_MARGIN, 12, { align: "right" });
  pdf.text(`Emitido em: ${formatarData(dados.createdAt)}`, larguraPagina - PAGE_MARGIN, 18, { align: "right" });

  pdf.setTextColor(20, 20, 20);
  let y = 34;

  // Cliente
  y = secaoTitulo(pdf, "Cliente", y, larguraPagina);
  y = escreverLinha(pdf, "Nome:", dados.cliente.nome, y, larguraPagina);
  y = escreverLinha(pdf, "CPF/CNPJ:", dados.cliente.cpfCnpj, y, larguraPagina);
  if (dados.cliente.telefone) y = escreverLinha(pdf, "Telefone:", dados.cliente.telefone, y, larguraPagina);
  if (dados.cliente.email) y = escreverLinha(pdf, "E-mail:", dados.cliente.email, y, larguraPagina);
  if (dados.cliente.cidade) y = escreverLinha(pdf, "Cidade:", dados.cliente.cidade, y, larguraPagina);
  if (dados.cliente.endereco) y = escreverLinha(pdf, "Endereço:", dados.cliente.endereco, y, larguraPagina);
  y += 3;

  // Propriedade
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
    if (dados.propriedade.area) {
      y = escreverLinha(pdf, "Área:", `${dados.propriedade.area.toLocaleString("pt-BR")} ha`, y, larguraPagina);
    }
    if (dados.propriedade.matricula) y = escreverLinha(pdf, "Matrícula:", dados.propriedade.matricula, y, larguraPagina);
    if (dados.propriedade.car) y = escreverLinha(pdf, "CAR:", dados.propriedade.car, y, larguraPagina);
    y += 3;
  }

  // Serviço
  y = secaoTitulo(pdf, "Serviço proposto", y, larguraPagina);
  y = escreverLinha(pdf, "Tipo de serviço:", dados.tipoServico, y, larguraPagina);
  if (dados.descricao) {
    y = escreverBloco(pdf, "Descrição / escopo:", dados.descricao, y, larguraPagina);
  }
  y += 1;

  // Condições comerciais
  y = secaoTitulo(pdf, "Condições comerciais", y, larguraPagina);
  y = escreverLinha(pdf, "Valor total:", formatarMoeda(dados.valor), y, larguraPagina);
  if (dados.condicoesPagamento) {
    y = escreverLinha(pdf, "Pagamento:", dados.condicoesPagamento, y, larguraPagina);
  }
  if (dados.prazoExecucaoDias) {
    y = escreverLinha(pdf, "Prazo de execução:", `${dados.prazoExecucaoDias} dia(s)`, y, larguraPagina);
  }
  if (dados.validadeAte) {
    y = escreverLinha(pdf, "Proposta válida até:", formatarData(dados.validadeAte), y, larguraPagina);
  }
  y += 3;

  // Observações
  if (dados.observacoes) {
    y = secaoTitulo(pdf, "Observações", y, larguraPagina);
    y = escreverBloco(pdf, "", dados.observacoes, y, larguraPagina);
  }

  // Rodapé
  const alturaPagina = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(200);
  pdf.line(PAGE_MARGIN, alturaPagina - 20, larguraPagina - PAGE_MARGIN, alturaPagina - 20);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    "Este documento é uma proposta comercial. A aprovação converte automaticamente em processo de trabalho.",
    larguraPagina / 2,
    alturaPagina - 12,
    { align: "center" }
  );
  pdf.text(`Geoaster · ${dados.protocolo}`, larguraPagina / 2, alturaPagina - 7, { align: "center" });

  pdf.save(`orcamento-${dados.protocolo}.pdf`);
}
