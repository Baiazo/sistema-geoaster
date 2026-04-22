-- CreateEnum
CREATE TYPE "CategoriaImovel" AS ENUM ('URBANO', 'RURAL');

-- CreateEnum
CREATE TYPE "StatusImovel" AS ENUM ('DISPONIVEL', 'VENDIDO');

-- AlterTable
ALTER TABLE "documentos" ADD COLUMN     "imovelId" TEXT;

-- CreateTable
CREATE TABLE "imoveis" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "corretorId" TEXT,
    "categoria" "CategoriaImovel" NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" "StatusImovel" NOT NULL DEFAULT 'DISPONIVEL',
    "valor" DOUBLE PRECISION,
    "exclusividade" BOOLEAN NOT NULL DEFAULT false,
    "dataCaptacao" TIMESTAMP(3),
    "localizacao" TEXT,
    "areaTotal" DOUBLE PRECISION,
    "areaUtil" DOUBLE PRECISION,
    "areaReservaLegal" DOUBLE PRECISION,
    "areaApp" DOUBLE PRECISION,
    "areaAberta" DOUBLE PRECISION,
    "areaMata" DOUBLE PRECISION,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imoveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imovel_interessados" (
    "imovelId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,

    CONSTRAINT "imovel_interessados_pkey" PRIMARY KEY ("imovelId","clienteId")
);

-- CreateTable
CREATE TABLE "visitas_imovel" (
    "id" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "clienteId" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitas_imovel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imovel_interessados" ADD CONSTRAINT "imovel_interessados_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imovel_interessados" ADD CONSTRAINT "imovel_interessados_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_imovel" ADD CONSTRAINT "visitas_imovel_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_imovel" ADD CONSTRAINT "visitas_imovel_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
