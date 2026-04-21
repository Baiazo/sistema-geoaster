-- CreateTable
CREATE TABLE "mensagens_do_dia" (
    "id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensagens_do_dia_pkey" PRIMARY KEY ("id")
);
