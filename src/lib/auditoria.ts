import { prisma } from "@/lib/prisma";

export type AcaoLog = "CRIAR" | "EDITAR" | "EXCLUIR" | "LOGIN" | "LOGOUT";

export async function registrarLog({
  usuarioId,
  acao,
  entidade,
  entidadeId,
  descricao,
}: {
  usuarioId?: string | null;
  acao: AcaoLog;
  entidade: string;
  entidadeId?: string | null;
  descricao?: string | null;
}) {
  try {
    await prisma.logAuditoria.create({
      data: {
        usuarioId: usuarioId ?? null,
        acao,
        entidade,
        entidadeId: entidadeId ?? null,
        descricao: descricao ?? null,
      },
    });
  } catch (e) {
    console.error("[auditoria]", e);
  }
}
