import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const documento = await prisma.documento.findUnique({ where: { id } });
    if (!documento) return Response.json({ error: "Documento não encontrado" }, { status: 404 });

    const filePath = path.join(process.cwd(), "uploads", documento.nomeArquivo);
    try {
      await unlink(filePath);
    } catch {
      // arquivo pode não existir mais no disco
    }

    await prisma.documento.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/documentos/:id]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
