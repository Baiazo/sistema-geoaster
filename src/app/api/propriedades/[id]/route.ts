import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const propriedade = await prisma.propriedade.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true } },
        processos: { orderBy: { createdAt: "desc" } },
        documentos: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!propriedade) return Response.json({ error: "Propriedade não encontrada" }, { status: 404 });
    return Response.json(propriedade);
  } catch (error) {
    console.error("[GET /api/propriedades/:id]", error);
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

    const { id } = await params;
    const body = await request.json();
    const { nome, municipio, cep, uf, area, matricula, car, ccir, coordenadas } = body;

    if (!nome || !municipio) {
      return Response.json({ error: "Nome e município são obrigatórios" }, { status: 400 });
    }

    const propriedade = await prisma.propriedade.update({
      where: { id },
      data: { nome, municipio, cep: cep || null, uf: uf || null, area, matricula, car, ccir, coordenadas },
    });

    return Response.json(propriedade);
  } catch (error) {
    console.error("[PUT /api/propriedades/:id]", error);
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
    await prisma.propriedade.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/propriedades/:id]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
