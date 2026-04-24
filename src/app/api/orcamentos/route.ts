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
    if (!perm.verOrcamentos) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const clienteId = searchParams.get("clienteId");
    const statusParam = searchParams.get("status");
    const statusValidos = ["PENDENTE", "APROVADO", "REJEITADO"] as const;
    const status = statusValidos.includes(statusParam as typeof statusValidos[number])
      ? (statusParam as typeof statusValidos[number])
      : null;
    const busca = searchParams.get("busca") || "";

    const orcamentos = await prisma.orcamento.findMany({
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
        processo: { select: { id: true, protocolo: true, status: true } },
        criadoPor: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(orcamentos);
  } catch (error) {
    console.error("[GET /api/orcamentos]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarOrcamentos) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const body = await request.json();
    const {
      clienteId,
      propriedadeId,
      tipoServico,
      descricao,
      valor,
      condicoesPagamento,
      prazoExecucaoDias,
      validadeAte,
      observacoes,
      atividades,
    } = body;

    if (!clienteId || !tipoServico) {
      return Response.json({ error: "Cliente e tipo de serviço são obrigatórios" }, { status: 400 });
    }

    const atividadesValidas =
      Array.isArray(atividades) && atividades.every((a) => typeof a === "string")
        ? atividades
        : null;

    const protocolo = await gerarProtocolo();

    const orcamento = await prisma.orcamento.create({
      data: {
        protocolo,
        clienteId,
        propriedadeId: propriedadeId || null,
        tipoServico,
        descricao: descricao || null,
        valor: valor !== undefined && valor !== null && valor !== "" ? Number(valor) : null,
        condicoesPagamento: condicoesPagamento || null,
        prazoExecucaoDias:
          prazoExecucaoDias !== undefined && prazoExecucaoDias !== null && prazoExecucaoDias !== ""
            ? Number(prazoExecucaoDias)
            : null,
        validadeAte: validadeAte ? new Date(validadeAte) : null,
        observacoes: observacoes || null,
        atividades: atividadesValidas ?? undefined,
        usuarioId: session.id,
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        propriedade: { select: { id: true, nome: true } },
        criadoPor: { select: { id: true, nome: true } },
      },
    });

    // TODO: integrar envio via WhatsApp (API externa) — disparar proposta ao cliente
    // assim que o orçamento for criado, usando orcamento.protocolo e dados do cliente.

    registrarLog({
      usuarioId: session.id,
      acao: "CRIAR",
      entidade: "Orcamento",
      entidadeId: orcamento.id,
      descricao: `Criou o orçamento ${orcamento.protocolo} — ${tipoServico}`,
    });

    return Response.json(orcamento, { status: 201 });
  } catch (error) {
    console.error("[POST /api/orcamentos]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
