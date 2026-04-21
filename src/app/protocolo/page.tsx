"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, CheckCircle, Clock, XCircle, Circle, Loader2 } from "lucide-react";

interface Historico {
  descricao: string;
  status: string;
  data: string;
}

interface ResultadoProtocolo {
  protocolo: string;
  tipoServico: string;
  status: string;
  dataInicio: string;
  dataFim?: string;
  cliente: string;
  propriedade?: string;
  equipe?: string;
  equipeResponsavel?: string;
  equipeTelefone?: string;
  historico: Historico[];
}

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const statusColors: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  EM_ANDAMENTO: "bg-blue-100 text-blue-700 border-blue-200",
  CONCLUIDO: "bg-green-100 text-green-700 border-green-200",
  CANCELADO: "bg-red-100 text-red-700 border-red-200",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "PENDENTE") return <Circle className="h-5 w-5 text-yellow-500" />;
  if (status === "EM_ANDAMENTO") return <Clock className="h-5 w-5 text-blue-500" />;
  if (status === "CONCLUIDO") return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === "CANCELADO") return <XCircle className="h-5 w-5 text-red-500" />;
  return null;
};

export default function ProtocoloPage() {
  const [numero, setNumero] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoProtocolo | null>(null);
  const [erro, setErro] = useState("");

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (!numero.trim()) return;
    setLoading(true);
    setErro("");
    setResultado(null);
    try {
      const res = await fetch(`/api/protocolo/${encodeURIComponent(numero.trim().toUpperCase())}`);
      if (!res.ok) {
        setErro("Protocolo não encontrado. Verifique o número e tente novamente.");
        return;
      }
      setResultado(await res.json());
    } catch {
      setErro("Erro ao buscar protocolo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-4">
      <div className="max-w-2xl mx-auto pt-12">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Image
              src="/logo-geoaster.png"
              alt="GeoAster"
              width={220}
              height={47}
              priority
              className="dark:hidden"
            />
            <Image
              src="/logo-geoaster-branco.png"
              alt="GeoAster"
              width={220}
              height={47}
              priority
              className="hidden dark:block"
            />
          </div>
          <p className="text-gray-600">Consulte o andamento do seu processo</p>
        </div>

        <Card className="shadow-lg mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleBuscar} className="flex gap-3">
              <label htmlFor="protocolo-input" className="sr-only">
                Número do protocolo
              </label>
              <Input
                id="protocolo-input"
                placeholder="Digite o número do protocolo (ex: GEO-2024-123456)"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="flex-1 uppercase"
                autoComplete="off"
              />
              <Button
                type="submit"
                className="bg-sky-500 hover:bg-sky-600"
                disabled={loading}
                aria-label="Buscar protocolo"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        {erro && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-red-700 text-sm">{erro}</p>
            </CardContent>
          </Card>
        )}

        {resultado && (
          <div className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Protocolo</p>
                    <CardTitle className="text-xl font-mono">{resultado.protocolo}</CardTitle>
                  </div>
                  <span className={`text-sm px-3 py-1.5 rounded-full border font-medium ${statusColors[resultado.status]}`}>
                    {statusLabels[resultado.status]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs">Serviço</p>
                    <p className="font-medium">{resultado.tipoServico}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Início</p>
                    <p className="font-medium">{new Date(resultado.dataInicio).toLocaleDateString("pt-BR")}</p>
                  </div>
                  {resultado.dataFim && (
                    <div>
                      <p className="text-gray-500 text-xs">Conclusão</p>
                      <p className="font-medium">{new Date(resultado.dataFim).toLocaleDateString("pt-BR")}</p>
                    </div>
                  )}
                  {resultado.propriedade && (
                    <div>
                      <p className="text-gray-500 text-xs">Propriedade</p>
                      <p className="font-medium">{resultado.propriedade}</p>
                    </div>
                  )}
                </div>
                {resultado.equipe && (
                  <div className="border-t pt-3 mt-1 space-y-2">
                    <div>
                      <p className="text-gray-500 text-xs">Equipe responsável</p>
                      <p className="font-medium">{resultado.equipe}</p>
                    </div>
                    {resultado.equipeResponsavel && (
                      <div>
                        <p className="text-gray-500 text-xs">Responsável</p>
                        <p className="font-medium">{resultado.equipeResponsavel}</p>
                      </div>
                    )}
                    {resultado.equipeTelefone && (
                      <div>
                        <p className="text-gray-500 text-xs">Contato</p>
                        <p className="font-medium">{resultado.equipeTelefone}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Histórico do Processo</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  {resultado.historico.map((h, i) => (
                    <div key={i} className="flex gap-3 relative">
                      {i < resultado.historico.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-px bg-gray-200" />
                      )}
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white">
                        <StatusIcon status={h.status} />
                      </div>
                      <div className="flex-1 pb-5 pt-1">
                        <p className="font-medium text-sm">{h.descricao}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {statusLabels[h.status]} · {new Date(h.data).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-center mt-8">
          <Image
            src="/logo-geoaster.png"
            alt="GeoAster"
            width={100}
            height={21}
            className="opacity-30 dark:hidden"
          />
          <Image
            src="/logo-geoaster-branco.png"
            alt="GeoAster"
            width={100}
            height={21}
            className="opacity-30 hidden dark:block"
          />
        </div>
      </div>
    </div>
  );
}
