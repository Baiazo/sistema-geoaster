import { prisma } from "@/lib/prisma";

function formatar(ano: number, numero: number): string {
  return `GEO-${ano}-${String(numero).padStart(6, "0")}`;
}

async function obterMaiorNumeroExistente(ano: number): Promise<number> {
  const prefixo = `GEO-${ano}-`;
  const [processos, orcamentos] = await Promise.all([
    prisma.processo.findMany({
      where: { protocolo: { startsWith: prefixo } },
      select: { protocolo: true },
    }),
    prisma.orcamento.findMany({
      where: { protocolo: { startsWith: prefixo } },
      select: { protocolo: true },
    }),
  ]);

  let maior = 0;
  for (const { protocolo } of [...processos, ...orcamentos]) {
    const sufixo = protocolo.slice(prefixo.length);
    const numero = Number.parseInt(sufixo, 10);
    if (Number.isFinite(numero) && numero > maior) maior = numero;
  }
  return maior;
}

export async function gerarProtocolo(): Promise<string> {
  const ano = new Date().getFullYear();

  const existente = await prisma.sequenciaProtocolo.findUnique({ where: { ano } });
  if (!existente) {
    const maior = await obterMaiorNumeroExistente(ano);
    await prisma.sequenciaProtocolo.upsert({
      where: { ano },
      create: { ano, ultimoNumero: maior },
      update: {},
    });
  }

  const atualizada = await prisma.sequenciaProtocolo.update({
    where: { ano },
    data: { ultimoNumero: { increment: 1 } },
  });

  return formatar(ano, atualizada.ultimoNumero);
}
