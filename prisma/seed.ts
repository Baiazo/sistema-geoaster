import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const senhaHash = await bcrypt.hash("admin123", 12);

  await prisma.usuario.upsert({
    where: { email: "admin@geoaster.com" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@geoaster.com",
      senha: senhaHash,
      perfilAcesso: "ADMIN",
    },
  });

  console.log("✅ Seed concluído!");
  console.log("📧 Email: admin@geoaster.com");
  console.log("🔑 Senha: admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
