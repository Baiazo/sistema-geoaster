import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle, Clock, XCircle, Circle } from "lucide-react";
import type { HistoricoProcesso, Documento } from "@prisma/client";

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const statusColors: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700",
  EM_ANDAMENTO: "bg-blue-100 text-blue-700",
  CONCLUIDO: "bg-green-100 text-green-700",
  CANCELADO: "bg-red-100 text-red-700",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "PENDENTE") return <Circle className="h-4 w-4 text-yellow-500" />;
  if (status === "EM_ANDAMENTO") return <Clock className="h-4 w-4 text-blue-500" />;
  if (status === "CONCLUIDO") return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "CANCELADO") return <XCircle className="h-4 w-4 text-red-500" />;
  return null;
}

export default async function ProcessoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const processo = await prisma.processo.findUnique({
    where: { id },
    include: {
      cliente: true,
      propriedade: true,
      historico: { orderBy: { createdAt: "asc" } },
      documentos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!processo) notFound();

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/processos" className={cn(buttonVariants({ variant: "ghost" }), "mb-4 -ml-2")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono">{processo.protocolo}</h1>
            <p className="text-muted-foreground mt-1">{processo.tipoServico}</p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColors[processo.status]}`}>
            {statusLabels[processo.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="font-medium text-muted-foreground">Cliente: </span>{processo.cliente.nome}</div>
            <div><span className="font-medium text-muted-foreground">Propriedade: </span>{processo.propriedade?.nome || "—"}</div>
            <div>
              <span className="font-medium text-muted-foreground">Início: </span>
              {new Date(processo.dataInicio).toLocaleDateString("pt-BR")}
            </div>
            {processo.dataFim && (
              <div>
                <span className="font-medium text-muted-foreground">Conclusão: </span>
                {new Date(processo.dataFim).toLocaleDateString("pt-BR")}
              </div>
            )}
            {processo.observacoes && (
              <div><span className="font-medium text-muted-foreground">Observações: </span>{processo.observacoes}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent>
          {processo.historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros no histórico</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {processo.historico.map((h: HistoricoProcesso, i: number) => (
                  <div key={h.id} className="flex gap-4 pl-10 relative">
                    <div className="absolute left-2.5 top-0.5">
                      <StatusIcon status={h.status} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{h.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {statusLabels[h.status]} · {new Date(h.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {processo.documentos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Documentos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {processo.documentos.map((d: Documento) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{d.nomeOriginal}</p>
                  <p className="text-xs text-muted-foreground">{d.tipo} · {Math.round(d.tamanho / 1024)} KB</p>
                </div>
                <a
                  href={d.caminho}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Baixar
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
