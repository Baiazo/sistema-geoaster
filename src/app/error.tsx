"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <AlertTriangle className="h-16 w-16 text-destructive" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Algo deu errado</h1>
        <p className="text-muted-foreground">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
      </div>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
