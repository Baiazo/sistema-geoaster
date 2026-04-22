import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { registrarLog } from "@/lib/auditoria";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.verImoveis) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const busca = searchParams.get("busca") || "";
    const status = searchParams.get("status") || "";
    const categoria = searchParams.get("categoria") || "";

    const imoveis = await prisma.imovel.findMany({
      where: {
        AND: [
          status ? { status: status as "DISPONIVEL" | "VENDIDO" } : {},
          categoria ? { categoria: categoria as "URBANO" | "RURAL" } : {},
          busca ? {
            OR: [
              { tipo: { contains: busca, mode: "insensitive" } },
              { localizacao: { contains: busca, mode: "insensitive" } },
              { cliente: { nome: { contains: busca, mode: "insensitive" } } },
            ],
          } : {},
        ],
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        corretor: { select: { id: true, nome: true } },
        _count: { select: { interessados: true, visitas: true, documentos: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(imoveis);
  } catch (error) {
    console.error("[GET /api/imoveis]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarImoveis) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const body = await request.json();
    const {
      clienteId, corretorId, categoria, tipo, valor, exclusividade,
      dataCaptacao, localizacao, areaTotal, areaUtil, areaReservaLegal,
      areaApp, areaAberta, areaMata, observacoes,
    } = body;

    if (!clienteId || !categoria || !tipo) {
      return Response.json({ error: "Proprietário, categoria e tipo são obrigatórios" }, { status: 400 });
    }

    const imovel = await prisma.imovel.create({
      data: {
        clienteId,
        corretorId: corretorId || null,
        categoria,
        tipo,
        valor: valor ? Number(valor) : null,
        exclusividade: Boolean(exclusividade),
        dataCaptacao: dataCaptacao ? new Date(dataCaptacao) : null,
        localizacao,
        areaTotal: areaTotal ? Number(areaTotal) : null,
        areaUtil: areaUtil ? Number(areaUtil) : null,
        areaReservaLegal: areaReservaLegal ? Number(areaReservaLegal) : null,
        areaApp: areaApp ? Number(areaApp) : null,
        areaAberta: areaAberta ? Number(areaAberta) : null,
        areaMata: areaMata ? Number(areaMata) : null,
        observacoes,
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        corretor: { select: { id: true, nome: true } },
      },
    });

    registrarLog({ usuarioId: session.id, acao: "CRIAR", entidade: "Imóvel", entidadeId: imovel.id, descricao: `Cadastrou imóvel ${tipo} em ${localizacao ?? "localização não informada"}` });
    return Response.json(imovel, { status: 201 });
  } catch (error) {
    console.error("[POST /api/imoveis]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
