import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const total = await prisma.documento.count();
console.log(`Total de documentos no banco: ${total}`);

if (total === 0) {
  console.log("Nenhum documento encontrado.");
} else {
  const { count } = await prisma.documento.deleteMany({});
  console.log(`${count} documento(s) removido(s).`);
}

await prisma.$disconnect();
