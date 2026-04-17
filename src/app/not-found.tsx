import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Página não encontrada</h1>
        <p className="text-muted-foreground">
          O endereço que você acessou não existe ou foi removido.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants()}>
        Voltar ao início
      </Link>
    </div>
  );
}
