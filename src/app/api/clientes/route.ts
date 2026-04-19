import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.verClientes) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const busca = searchParams.get("busca") || "";

    const clientes = await prisma.cliente.findMany({
      where: {
        ativo: true,
        OR: busca
          ? [
              { nome: { contains: busca, mode: "insensitive" } },
              { cpfCnpj: { contains: busca } },
              { email: { contains: busca, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { nome: "asc" },
      include: {
        _count: { select: { propriedades: true, processos: true } },
      },
    });

    return Response.json(clientes);
  } catch (error) {
    console.error("[GET /api/clientes]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarClientes) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const body = await request.json();
    const { nome, cpfCnpj, telefone, email, endereco, observacoes } = body;

    if (!nome || !cpfCnpj) {
      return Response.json({ error: "Nome e CPF/CNPJ são obrigatórios" }, { status: 400 });
    }

    const existente = await prisma.cliente.findUnique({ where: { cpfCnpj } });
    if (existente) {
      return Response.json({ error: "CPF/CNPJ já cadastrado" }, { status: 409 });
    }

    const cliente = await prisma.cliente.create({
      data: { nome, cpfCnpj, telefone, email, endereco, observacoes },
    });

    return Response.json(cliente, { status: 201 });
  } catch (error) {
    console.error("[POST /api/clientes]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
