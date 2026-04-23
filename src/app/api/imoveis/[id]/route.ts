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
    if (!perm.verImoveis) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const imovel = await prisma.imovel.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true, email: true } },
        corretor: { select: { id: true, nome: true, email: true } },
        interessados: {
          include: { cliente: { select: { id: true, nome: true, telefone: true, email: true } } },
        },
        visitas: {
          include: { cliente: { select: { id: true, nome: true } } },
          orderBy: { data: "desc" },
        },
        documentos: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!imovel) return Response.json({ error: "Imóvel não encontrado" }, { status: 404 });
    return Response.json(imovel);
  } catch (error) {
    console.error("[GET /api/imoveis/:id]", error);
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
    if (!perm.cadastrarImoveis) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const {
      clienteId, corretorId, categoria, tipo, status, valor, exclusividade,
      dataCaptacao, localizacao, cep, rua, numero, bairro, cidade, estado,
      areaM2, areaTotal, areaUtil, areaReservaLegal,
      areaApp, areaAberta, areaMata, observacoes,
    } = body;

    if (!clienteId || !categoria || !tipo) {
      return Response.json({ error: "Proprietário, categoria e tipo são obrigatórios" }, { status: 400 });
    }

    const imovel = await prisma.imovel.update({
      where: { id },
      data: {
        clienteId,
        corretorId: corretorId || null,
        categoria,
        tipo,
        status,
        valor: valor ? Number(valor) : null,
        exclusividade: Boolean(exclusividade),
        dataCaptacao: dataCaptacao ? new Date(dataCaptacao) : null,
        localizacao,
        cep: cep || null,
        rua: rua || null,
        numero: numero || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
        areaM2: areaM2 ? Number(areaM2) : null,
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

    registrarLog({ usuarioId: session.id, acao: "EDITAR", entidade: "Imóvel", entidadeId: id, descricao: `Editou imóvel ${tipo}` });
    return Response.json(imovel);
  } catch (error) {
    console.error("[PUT /api/imoveis/:id]", error);
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
    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.cadastrarImoveis) return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const imovel = await prisma.imovel.findUnique({ where: { id }, select: { tipo: true, localizacao: true } });
    await prisma.imovel.delete({ where: { id } });
    registrarLog({ usuarioId: session.id, acao: "EXCLUIR", entidade: "Imóvel", entidadeId: id, descricao: `Excluiu imóvel ${imovel?.tipo ?? id}` });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/imoveis/:id]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
