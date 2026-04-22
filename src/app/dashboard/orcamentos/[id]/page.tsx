import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { OrcamentoPdfButton } from "./pdf-button";

function formatarMoeda(valor?: number | null): string {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data?: Date | string | null): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR");
}

export default async function OrcamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: {
      cliente: true,
      propriedade: true,
      processo: { select: { id: true, protocolo: true, status: true } },
      criadoPor: { select: { id: true, nome: true } },
    },
  });

  if (!orcamento) notFound();

  const pdfDados = {
    protocolo: orcamento.protocolo,
    tipoServico: orcamento.tipoServico,
    status: orcamento.status,
    descricao: orcamento.descricao,
    valor: orcamento.valor,
    condicoesPagamento: orcamento.condicoesPagamento,
    prazoExecucaoDias: orcamento.prazoExecucaoDias,
    validadeAte: orcamento.validadeAte ? orcamento.validadeAte.toISOString() : null,
    observacoes: orcamento.observacoes,
    createdAt: orcamento.createdAt.toISOString(),
    cliente: {
      nome: orcamento.cliente.nome,
      cpfCnpj: orcamento.cliente.cpfCnpj,
      telefone: orcamento.cliente.telefone,
      email: orcamento.cliente.email,
      cidade: orcamento.cliente.cidade,
      endereco: orcamento.cliente.endereco,
    },
    propriedade: orcamento.propriedade
      ? {
          nome: orcamento.propriedade.nome,
          municipio: orcamento.propriedade.municipio,
          uf: orcamento.propriedade.uf,
          area: orcamento.propriedade.area,
          matricula: orcamento.propriedade.matricula,
          car: orcamento.propriedade.car,
        }
      : null,
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/orcamentos" className={cn(buttonVariants({ variant: "ghost" }), "mb-4 -ml-2")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold font-mono">{orcamento.protocolo}</h1>
            <p className="text-muted-foreground mt-1">{orcamento.tipoServico}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={orcamento.status} />
            <OrcamentoPdfButton dados={pdfDados} />
          </div>
        </div>
      </div>

      {orcamento.processo && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Orçamento aprovado — processo criado
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Protocolo: <span className="font-mono">{orcamento.processo.protocolo}</span>
              </p>
            </div>
            <Link
              href={`/dashboard/processos/${orcamento.processo.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Ver processo
            </Link>
          </CardContent>
        </Card>
      )}

      {orcamento.status === "REJEITADO" && orcamento.motivoRejeicao && (
        <Card className="mb-4 border-rose-200 bg-rose-50/50 dark:bg-rose-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300 mb-1">
              Orçamento rejeitado
            </p>
            <p className="text-sm text-rose-900 dark:text-rose-100 whitespace-pre-wrap">
              {orcamento.motivoRejeicao}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="font-medium text-muted-foreground">Nome: </span>{orcamento.cliente.nome}</div>
            <div><span className="font-medium text-muted-foreground">CPF/CNPJ: </span>{orcamento.cliente.cpfCnpj}</div>
            {orcamento.cliente.telefone && (
              <div><span className="font-medium text-muted-foreground">Telefone: </span>{orcamento.cliente.telefone}</div>
            )}
            {orcamento.cliente.email && (
              <div><span className="font-medium text-muted-foreground">E-mail: </span>{orcamento.cliente.email}</div>
            )}
            {orcamento.cliente.cidade && (
              <div><span className="font-medium text-muted-foreground">Cidade: </span>{orcamento.cliente.cidade}</div>
            )}
          </CardContent>
        </Card>

        {orcamento.propriedade && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Propriedade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-medium text-muted-foreground">Nome: </span>{orcamento.propriedade.nome}</div>
              <div>
                <span className="font-medium text-muted-foreground">Município: </span>
                {orcamento.propriedade.municipio}{orcamento.propriedade.uf ? ` / ${orcamento.propriedade.uf}` : ""}
              </div>
              {orcamento.propriedade.area && (
                <div>
                  <span className="font-medium text-muted-foreground">Área: </span>
                  {orcamento.propriedade.area.toLocaleString("pt-BR")} ha
                </div>
              )}
              {orcamento.propriedade.matricula && (
                <div><span className="font-medium text-muted-foreground">Matrícula: </span>{orcamento.propriedade.matricula}</div>
              )}
              {orcamento.propriedade.car && (
                <div><span className="font-medium text-muted-foreground">CAR: </span>{orcamento.propriedade.car}</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Proposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="font-medium text-muted-foreground">Valor: </span>{formatarMoeda(orcamento.valor)}</div>
          {orcamento.condicoesPagamento && (
            <div><span className="font-medium text-muted-foreground">Pagamento: </span>{orcamento.condicoesPagamento}</div>
          )}
          {orcamento.prazoExecucaoDias && (
            <div><span className="font-medium text-muted-foreground">Prazo: </span>{orcamento.prazoExecucaoDias} dia(s)</div>
          )}
          {orcamento.validadeAte && (
            <div><span className="font-medium text-muted-foreground">Válido até: </span>{formatarData(orcamento.validadeAte)}</div>
          )}
          {orcamento.descricao && (
            <div className="pt-2">
              <p className="font-medium text-muted-foreground mb-1">Descrição:</p>
              <p className="whitespace-pre-wrap">{orcamento.descricao}</p>
            </div>
          )}
          {orcamento.observacoes && (
            <div className="pt-2">
              <p className="font-medium text-muted-foreground mb-1">Observações:</p>
              <p className="whitespace-pre-wrap">{orcamento.observacoes}</p>
            </div>
          )}
          <div className="pt-2 text-xs text-muted-foreground">
            Criado em {new Date(orcamento.createdAt).toLocaleString("pt-BR")}
            {orcamento.criadoPor ? ` por ${orcamento.criadoPor.nome}` : ""}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
