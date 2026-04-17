import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const TAMANHO_MAXIMO = 20 * 1024 * 1024; // 20 MB

const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]);

const EXTENSOES_PERMITIDAS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"]);

function sanitizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const clienteId = searchParams.get("clienteId");
    const propriedadeId = searchParams.get("propriedadeId");
    const processoId = searchParams.get("processoId");

    const documentos = await prisma.documento.findMany({
      where: {
        ...(clienteId ? { clienteId } : {}),
        ...(propriedadeId ? { propriedadeId } : {}),
        ...(processoId ? { processoId } : {}),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        propriedade: { select: { id: true, nome: true } },
        processo: { select: { id: true, protocolo: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(documentos);
  } catch (error) {
    console.error("[GET /api/documentos]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const formData = await request.formData();
    const arquivo = formData.get("arquivo") as File | null;
    const tipo = formData.get("tipo") as string | null;
    const clienteId = formData.get("clienteId") as string | null;
    const propriedadeId = formData.get("propriedadeId") as string | null;
    const processoId = formData.get("processoId") as string | null;

    if (!arquivo || !tipo) {
      return Response.json({ error: "Arquivo e tipo são obrigatórios" }, { status: 400 });
    }

    if (arquivo.size > TAMANHO_MAXIMO) {
      return Response.json({ error: "Arquivo muito grande. Tamanho máximo: 20 MB" }, { status: 400 });
    }

    if (!TIPOS_PERMITIDOS.has(arquivo.type)) {
      return Response.json(
        { error: "Tipo de arquivo não permitido. Use: PDF, Word, Excel, JPG ou PNG" },
        { status: 400 }
      );
    }

    const ext = path.extname(arquivo.name).toLowerCase();
    if (!EXTENSOES_PERMITIDAS.has(ext)) {
      return Response.json(
        { error: "Extensão de arquivo não permitida" },
        { status: 400 }
      );
    }

    const bytes = await arquivo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const nomeSeguro = sanitizarNome(path.basename(arquivo.name, ext));
    const nomeArquivo = `${Date.now()}-${nomeSeguro}${ext}`;
    const uploadDir = path.join(process.cwd(), "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, nomeArquivo), buffer);

    const documento = await prisma.documento.create({
      data: {
        nomeArquivo,
        nomeOriginal: arquivo.name,
        tipo,
        tamanho: arquivo.size,
        caminho: `/uploads/${nomeArquivo}`,
        clienteId: clienteId || null,
        propriedadeId: propriedadeId || null,
        processoId: processoId || null,
      },
    });

    return Response.json(documento, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documentos]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
