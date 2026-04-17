import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    if (session.perfilAcesso !== "ADMIN") {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;

    if (session.id === id) {
      return Response.json({ error: "Você não pode excluir sua própria conta" }, { status: 400 });
    }

    await prisma.usuario.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/usuarios/[id]]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
