-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "propriedadeId" TEXT,
    "tipoServico" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DOUBLE PRECISION,
    "condicoesPagamento" TEXT,
    "prazoExecucaoDias" INTEGER,
    "validadeAte" TIMESTAMP(3),
    "observacoes" TEXT,
    "status" "StatusOrcamento" NOT NULL DEFAULT 'PENDENTE',
    "processoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequencia_protocolo" (
    "ano" INTEGER NOT NULL,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sequencia_protocolo_pkey" PRIMARY KEY ("ano")
);

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_protocolo_key" ON "orcamentos"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_processoId_key" ON "orcamentos"("processoId");

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_propriedadeId_fkey" FOREIGN KEY ("propriedadeId") REFERENCES "propriedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
