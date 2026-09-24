import bcrypt from "bcrypt";
import { prisma } from "./prisma";
import dotenv from "dotenv";

dotenv.config();

const user = {
  email: process.env.ADMIN_EMAIL || "superadmin@example.com",
  password: process.env.ADMIN_PASSWORD || "123456789",
  role: "SUPERADMIN" as const,
};

async function seed() {
  console.log(`🌱 Verificando usuario administrador inicial (${user.email})...`);
  const hashedPassword = await bcrypt.hash(user.password, 10);

  const admin = await prisma.user.upsert({
    where: { email: user.email },
    update: {},
    create: {
      email: user.email,
      password: hashedPassword,
      role: user.role,
    },
  });

  console.log(`✅ Usuario administrador inicial listo (ID: ${admin.id}, Email: ${admin.email})`);
}

seed()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Error ejecutando seed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });

