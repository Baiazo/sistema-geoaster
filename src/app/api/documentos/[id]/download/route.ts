import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPermissoesEfetivas } from "@/lib/permissoes";
import { readFile, stat } from "fs/promises";
import path from "path";

const MIME_POR_EXTENSAO: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const perm = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);
    if (!perm.verDocumentos) {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const documento = await prisma.documento.findUnique({ where: { id } });
    if (!documento) return Response.json({ error: "Documento não encontrado" }, { status: 404 });

    // Defesa contra path traversal: só aceitamos o basename que está no banco.
    const safeName = path.basename(documento.nomeArquivo);
    const uploadDir = path.resolve(process.cwd(), "uploads");
    const filePath = path.resolve(uploadDir, safeName);

    // Garante que o caminho resolvido permanece dentro de uploads/.
    if (!filePath.startsWith(uploadDir + path.sep) && filePath !== uploadDir) {
      return Response.json({ error: "Caminho inválido" }, { status: 400 });
    }

    try {
      await stat(filePath);
    } catch {
      return Response.json({ error: "Arquivo não encontrado no servidor" }, { status: 404 });
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = MIME_POR_EXTENSAO[ext] ?? "application/octet-stream";

    // Sanitiza o nome original para o header Content-Disposition (evita CRLF injection).
    const nomeOriginalSeguro = documento.nomeOriginal
      .replace(/[\r\n"\\]/g, "_")
      .slice(0, 200);
    const fallbackName = safeName.replace(/[\r\n"\\]/g, "_");

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `inline; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(nomeOriginalSeguro)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/documentos/:id/download]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
