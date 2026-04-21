import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { registrarLog } from "@/lib/auditoria";

const MAX_LENGTH = 500;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const mensagem = await prisma.mensagemDoDia.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!mensagem || !mensagem.ativa || !mensagem.conteudo.trim()) {
      return Response.json({ mensagem: null });
    }

    return Response.json({
      mensagem: {
        id: mensagem.id,
        conteudo: mensagem.conteudo,
        ativa: mensagem.ativa,
        updatedAt: mensagem.updatedAt,
      },
    });
  } catch (error) {
    console.error("[GET /api/mensagem-do-dia]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    if (session.perfilAcesso !== "ADMIN") {
      return Response.json({ error: "Apenas administradores podem editar a mensagem do dia" }, { status: 403 });
    }

    const body = await request.json();
    const conteudoRaw = typeof body?.conteudo === "string" ? body.conteudo : "";
    const ativa = body?.ativa !== false;
    const conteudo = conteudoRaw.trim();

    if (conteudo.length > MAX_LENGTH) {
      return Response.json(
        { error: `A mensagem não pode ter mais de ${MAX_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    const existente = await prisma.mensagemDoDia.findFirst({ orderBy: { updatedAt: "desc" } });

    const mensagem = existente
      ? await prisma.mensagemDoDia.update({
          where: { id: existente.id },
          data: { conteudo, ativa: ativa && conteudo.length > 0 },
        })
      : await prisma.mensagemDoDia.create({
          data: { conteudo, ativa: ativa && conteudo.length > 0 },
        });

    registrarLog({
      usuarioId: session.id,
      acao: "EDITAR",
      entidade: "MensagemDoDia",
      entidadeId: mensagem.id,
      descricao: conteudo.length === 0 ? "Mensagem do dia removida" : "Mensagem do dia atualizada",
    });

    return Response.json({
      mensagem: {
        id: mensagem.id,
        conteudo: mensagem.conteudo,
        ativa: mensagem.ativa,
        updatedAt: mensagem.updatedAt,
      },
    });
  } catch (error) {
    console.error("[PUT /api/mensagem-do-dia]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
