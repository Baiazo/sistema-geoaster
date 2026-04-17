import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const clienteId = searchParams.get("clienteId");

    const propriedades = await prisma.propriedade.findMany({
      where: clienteId ? { clienteId } : undefined,
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { nome: "asc" },
    });

    return Response.json(propriedades);
  } catch (error) {
    console.error("[GET /api/propriedades]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const body = await request.json();
    const { clienteId, nome, municipio, cep, uf, area, matricula, car, ccir, coordenadas } = body;

    if (!clienteId || !nome || !municipio) {
      return Response.json({ error: "Cliente, nome e município são obrigatórios" }, { status: 400 });
    }

    const propriedade = await prisma.propriedade.create({
      data: { clienteId, nome, municipio, cep: cep || null, uf: uf || null, area, matricula, car, ccir, coordenadas },
    });

    return Response.json(propriedade, { status: 201 });
  } catch (error) {
    console.error("[POST /api/propriedades]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
