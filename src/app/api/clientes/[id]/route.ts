import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { registrarLog } from "@/lib/auditoria";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.verClientes) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        propriedades: true,
        processos: {
          include: { propriedade: true },
          orderBy: { createdAt: "desc" },
        },
        documentos: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!cliente) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });
    return Response.json(cliente);
  } catch (error) {
    console.error("[GET /api/clientes/:id]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarClientes) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { nome, cpfCnpj, telefone, email, cidade, endereco, observacoes } = body;

    if (!nome || !cpfCnpj) {
      return Response.json({ error: "Nome e CPF/CNPJ são obrigatórios" }, { status: 400 });
    }

    const existente = await prisma.cliente.findFirst({
      where: { cpfCnpj, id: { not: id } },
    });
    if (existente) {
      return Response.json({ error: "CPF/CNPJ já cadastrado" }, { status: 409 });
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: { nome, cpfCnpj, telefone, email, cidade, endereco, observacoes },
    });

    registrarLog({ usuarioId: session.id, acao: "EDITAR", entidade: "Cliente", entidadeId: id, descricao: `Editou o cliente "${nome}"` });
    return Response.json(cliente);
  } catch (error) {
    console.error("[PUT /api/clientes/:id]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    if (session.perfilAcesso !== "ADMIN") {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const cli = await prisma.cliente.findUnique({ where: { id }, select: { nome: true } });
    await prisma.cliente.update({ where: { id }, data: { ativo: false } });
    registrarLog({ usuarioId: session.id, acao: "EXCLUIR", entidade: "Cliente", entidadeId: id, descricao: `Excluiu o cliente "${cli?.nome ?? id}"` });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/clientes/:id]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
