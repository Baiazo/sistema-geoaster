-- CreateEnum
CREATE TYPE "Setor" AS ENUM ('GEO', 'AMBIENTAL', 'IMOVEIS');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "setores" "Setor"[] DEFAULT ARRAY[]::"Setor"[];

-- AlterTable
ALTER TABLE "propriedades" ADD COLUMN     "setores" "Setor"[] DEFAULT ARRAY[]::"Setor"[];

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "setores" "Setor"[] DEFAULT ARRAY[]::"Setor"[];
