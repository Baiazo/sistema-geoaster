import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface ClienteImport {
  nome: string;
  cpfCnpj: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const { clientes }: { clientes: ClienteImport[] } = await request.json();

    if (!Array.isArray(clientes) || clientes.length === 0) {
      return Response.json({ error: "Nenhum cliente enviado" }, { status: 400 });
    }

    if (clientes.length > 1000) {
      return Response.json({ error: "Máximo de 1000 clientes por importação" }, { status: 400 });
    }

    const result = await prisma.cliente.createMany({
      data: clientes.map((c) => ({
        nome: c.nome.trim(),
        cpfCnpj: c.cpfCnpj.trim(),
        telefone: c.telefone?.trim() || null,
        email: c.email?.trim() || null,
        endereco: c.endereco?.trim() || null,
        observacoes: c.observacoes?.trim() || null,
      })),
      skipDuplicates: true,
    });

    return Response.json({
      importados: result.count,
      ignorados: clientes.length - result.count,
    });
  } catch (error) {
    console.error("[POST /api/clientes/importar]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
