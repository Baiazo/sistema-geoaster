-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "permissoes" JSONB NOT NULL DEFAULT '{}';
