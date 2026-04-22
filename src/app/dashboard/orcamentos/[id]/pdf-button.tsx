"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { gerarOrcamentoPdf, type OrcamentoPdfData } from "@/lib/orcamento-pdf";

export function OrcamentoPdfButton({ dados }: { dados: OrcamentoPdfData }) {
  const [gerando, setGerando] = useState(false);

  async function handleBaixar() {
    setGerando(true);
    try {
      await gerarOrcamentoPdf(dados);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Button onClick={handleBaixar} variant="outline" size="sm" disabled={gerando}>
      {gerando ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <FileDown className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      Baixar PDF
    </Button>
  );
}
