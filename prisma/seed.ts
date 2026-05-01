//ejecutar con: npx tsx seed.ts
import { prisma } from "../src/lib/prisma"
import bcrypt from "bcrypt"


type Role = "SUPERADMIN" | "ADMIN" | "USER"

type UserSchema = {
    id?: string;
    email: string;
    password: string;
    role: Role;
}

const user: UserSchema = {
    email: "email@example.com",
    password: "password1234",
    role: "SUPERADMIN"
}

async function seed() {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
            email: user.email,
            password: hashedPassword,
            role: user.role
        }
    });
}

seed()
    .then(() => {
        console.log("Seed completo");
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });