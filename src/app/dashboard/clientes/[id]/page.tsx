import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, MapPin, FileText, FolderOpen } from "lucide-react";
import { AddPropriedade } from "./add-propriedade";
import { AddProcesso } from "./add-processo";
import { AddDocumento } from "./add-documento";

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDENTE: "secondary",
  EM_ANDAMENTO: "default",
  CONCLUIDO: "outline",
  CANCELADO: "destructive",
};

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      propriedades: true,
      processos: {
        include: { propriedade: { select: { nome: true } } },
        orderBy: { createdAt: "desc" },
      },
      documentos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!cliente) notFound();

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/clientes" className={cn(buttonVariants({ variant: "ghost" }), "mb-4 -ml-2")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{cliente.nome}</h1>
        <p className="text-muted-foreground">{cliente.cpfCnpj}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados do Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(
              [
                ["Telefone", cliente.telefone],
                ["Email", cliente.email],
                ["Endereço", cliente.endereco],
                ["Observações", cliente.observacoes],
              ] as [string, string | null | undefined][]
            ).map(([label, value]) =>
              value ? (
                <div key={label}>
                  <span className="font-medium text-muted-foreground">{label}: </span>
                  <span className="text-foreground">{value}</span>
                </div>
              ) : null
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Propriedades ({cliente.propriedades.length})
            </CardTitle>
            <div className="flex gap-2">
              <AddPropriedade clienteId={id} />
              <Link href={`/dashboard/propriedades?clienteId=${id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {cliente.propriedades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma propriedade cadastrada</p>
            ) : (
              <div className="space-y-2">
                {cliente.propriedades.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.municipio} {p.area ? `· ${p.area} ha` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Processos ({cliente.processos.length})
            </CardTitle>
            <AddProcesso clienteId={id} propriedades={cliente.propriedades.map((p) => ({ id: p.id, nome: p.nome }))} />
          </CardHeader>
          <CardContent>
            {cliente.processos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum processo cadastrado</p>
            ) : (
              <div className="space-y-2">
                {cliente.processos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{p.protocolo}</p>
                      <p className="text-xs text-muted-foreground">{p.tipoServico}</p>
                    </div>
                    <Badge variant={statusVariants[p.status]}>{statusLabels[p.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" /> Documentos ({cliente.documentos.length})
            </CardTitle>
            <AddDocumento clienteId={id} />
          </CardHeader>
          <CardContent>
            {cliente.documentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
            ) : (
              <div className="space-y-2">
                {cliente.documentos.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
