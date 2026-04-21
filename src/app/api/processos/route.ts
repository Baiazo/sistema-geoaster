import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { gerarProtocolo } from "@/lib/protocolo";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { registrarLog } from "@/lib/auditoria";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.verProcessos) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const clienteId = searchParams.get("clienteId");
    const statusParam = searchParams.get("status");
    const statusValidos = ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO"] as const;
    const status = statusValidos.includes(statusParam as typeof statusValidos[number])
      ? (statusParam as typeof statusValidos[number])
      : null;
    const busca = searchParams.get("busca") || "";

    const processos = await prisma.processo.findMany({
      where: {
        ...(clienteId ? { clienteId } : {}),
        ...(status ? { status } : {}),
        ...(busca
          ? {
              OR: [
                { protocolo: { contains: busca, mode: "insensitive" } },
                { tipoServico: { contains: busca, mode: "insensitive" } },
                { cliente: { nome: { contains: busca, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        propriedade: { select: { id: true, nome: true } },
        equipe: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(processos);
  } catch (error) {
    console.error("[GET /api/processos]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarProcessos) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const body = await request.json();
    const { clienteId, propriedadeId, equipeId, tipoServico, observacoes, valor } = body;

    if (!clienteId || !tipoServico) {
      return Response.json({ error: "Cliente e tipo de serviço são obrigatórios" }, { status: 400 });
    }

    let protocolo = gerarProtocolo();
    let tentativas = 0;
    while (tentativas < 5) {
      const existe = await prisma.processo.findUnique({ where: { protocolo } });
      if (!existe) break;
      protocolo = gerarProtocolo();
      tentativas++;
    }

    const processo = await prisma.processo.create({
      data: {
        protocolo,
        clienteId,
        propriedadeId: propriedadeId || null,
        equipeId: equipeId || null,
        tipoServico,
        observacoes,
        valor: valor ? Number(valor) : null,
        historico: {
          create: {
            descricao: "Processo criado",
            status: "PENDENTE",
          },
        },
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        propriedade: { select: { id: true, nome: true } },
        equipe: { select: { id: true, nome: true } },
      },
    });

    registrarLog({ usuarioId: session.id, acao: "CRIAR", entidade: "Processo", entidadeId: processo.id, descricao: `Criou o processo ${processo.protocolo} — ${tipoServico}` });
    return Response.json(processo, { status: 201 });
  } catch (error) {
    console.error("[POST /api/processos]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
