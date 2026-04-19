import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    if (session.perfilAcesso !== "ADMIN") return Response.json({ error: "Sem permissão" }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") || "";
    const acao = searchParams.get("acao") || "";
    const entidade = searchParams.get("entidade") || "";
    const usuarioId = searchParams.get("usuarioId") || "";
    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");
    const pagina = Math.max(1, Number(searchParams.get("pagina") || "1"));
    const limite = 50;

    const where = {
      ...(q ? {
        OR: [
          { descricao: { contains: q, mode: "insensitive" as const } },
          { entidade: { contains: q, mode: "insensitive" as const } },
          { usuario: { nome: { contains: q, mode: "insensitive" as const } } },
        ],
      } : {}),
      ...(acao ? { acao } : {}),
      ...(entidade ? { entidade } : {}),
      ...(usuarioId ? { usuarioId } : {}),
      ...(inicio || fim ? {
        createdAt: {
          ...(inicio ? { gte: new Date(inicio) } : {}),
          ...(fim ? { lte: new Date(fim + "T23:59:59.999Z") } : {}),
        },
      } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.logAuditoria.count({ where }),
      prisma.logAuditoria.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pagina - 1) * limite,
        take: limite,
        include: {
          usuario: { select: { id: true, nome: true, email: true } },
        },
      }),
    ]);

    return Response.json({ logs, total, paginas: Math.ceil(total / limite), pagina });
  } catch (error) {
    console.error("[GET /api/admin/logs]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
