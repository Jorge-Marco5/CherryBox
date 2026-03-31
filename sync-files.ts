import { prisma } from "./src/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { getBaseDir } from "./src/utils/settings";

const BASE_DIR = getBaseDir();

async function sync() {
    const superadmin = await prisma.user.findFirst({ where: { role: "SUPERADMIN" } });
    if (!superadmin) {
        console.error("No se encontró un SUPERADMIN para asignar la propiedad inicial.");
        return;
    }

    const scan = async (currentDir: string, parentId: string | null = null) => {
        const fullPath = path.join(BASE_DIR, currentDir);
        const items = await fs.readdir(fullPath, { withFileTypes: true });

        for (const item of items) {
            const relativePath = path.join(currentDir, item.name);
            const isDirectory = item.isDirectory();

            // Upsert en la base de datos
            const dbFile = await prisma.file.upsert({
                where: { path: relativePath },
                update: {
                    name: item.name,
                    type: isDirectory ? "FOLDER" : "FILE",
                    parentId
                },
                create: {
                    name: item.name,
                    path: relativePath,
                    type: isDirectory ? "FOLDER" : "FILE",
                    ownerId: superadmin.id,
                    parentId
                }
            });

            // Si es carpeta, continuar recursivamente
            if (isDirectory) {
                await scan(relativePath, dbFile.id);
            }
        }
    };

    console.log("Iniciando sincronización de archivos...");
    await scan("");
    console.log("Sincronización completada exitosamente.");
}

sync()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
