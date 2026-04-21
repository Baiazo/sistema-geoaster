import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { registrarLog } from "@/lib/auditoria";

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
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarClientes) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { clientes }: { clientes: ClienteImport[] } = await request.json();

    if (!Array.isArray(clientes) || clientes.length === 0) {
      return Response.json({ error: "Nenhum cliente enviado" }, { status: 400 });
    }

    if (clientes.length > 1000) {
      return Response.json({ error: "Máximo de 1000 clientes por importação" }, { status: 400 });
    }

    // Valida cada linha antes do insert em massa.
    const normalizados = clientes.map((c) => {
      const nome = typeof c.nome === "string" ? c.nome.trim() : "";
      const cpfCnpj = typeof c.cpfCnpj === "string" ? c.cpfCnpj.trim() : "";
      return {
        nome,
        cpfCnpj,
        telefone: typeof c.telefone === "string" ? c.telefone.trim() || null : null,
        email: typeof c.email === "string" ? c.email.trim() || null : null,
        endereco: typeof c.endereco === "string" ? c.endereco.trim() || null : null,
        observacoes: typeof c.observacoes === "string" ? c.observacoes.trim() || null : null,
      };
    });

    const invalidos = normalizados.filter((c) => !c.nome || !c.cpfCnpj);
    if (invalidos.length > 0) {
      return Response.json(
        { error: `${invalidos.length} registro(s) sem nome ou CPF/CNPJ` },
        { status: 400 }
      );
    }

    const result = await prisma.cliente.createMany({
      data: normalizados,
      skipDuplicates: true,
    });

    registrarLog({
      usuarioId: session.id,
      acao: "CRIAR",
      entidade: "Cliente",
      descricao: `Importou ${result.count} cliente(s) em lote`,
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
