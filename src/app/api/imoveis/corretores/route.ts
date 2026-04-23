import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.verImoveis && !perm.cadastrarImoveis) {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }

    const corretores = await prisma.usuario.findMany({
      where: {
        ativo: true,
        setores: { has: "IMOVEIS" },
      },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: "asc" },
    });

    return Response.json(corretores);
  } catch (error) {
    console.error("[GET /api/imoveis/corretores]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
