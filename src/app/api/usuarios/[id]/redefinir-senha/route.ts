import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { registrarLog } from "@/lib/auditoria";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
    if (session.perfilAcesso !== "ADMIN") {
      return Response.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const { senha } = await request.json();

    if (!senha || typeof senha !== "string" || senha.length < 8) {
      return Response.json({ error: "Senha deve ter no mínimo 8 caracteres" }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true },
    });

    if (!usuario) {
      return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const hash = await bcrypt.hash(senha, 12);

    await prisma.usuario.update({
      where: { id },
      data: { senha: hash },
    });

    registrarLog({
      usuarioId: session.id,
      acao: "EDITAR",
      entidade: "Usuário",
      entidadeId: id,
      descricao: `Redefiniu a senha do usuário "${usuario.nome}" (${usuario.email})`,
    });

    return Response.json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
    console.error("[POST /api/usuarios/[id]/redefinir-senha]", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
