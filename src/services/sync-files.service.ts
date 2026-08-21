import { prisma } from "../lib/prisma";
import fs from "fs/promises";
import path from "path";
import { getBaseDir } from "../utils/settings";
import { logger } from "../utils/logger";

const BASE_DIR = getBaseDir();

const IGNORE_PATHS = new Set(['thumbnails', 'private']);

export async function syncFiles() {
    const superadmin = await prisma.user.findFirst({ where: { role: "SUPERADMIN" } });
    if (!superadmin) {
        logger.error("[SyncFiles] No se encontró un SUPERADMIN para asignar la propiedad inicial.");
        return;
    }

    const scan = async (currentDir: string, parentId: string | null = null) => {
        const fullPath = path.join(BASE_DIR, currentDir);
        const items = await fs.readdir(fullPath, { withFileTypes: true });

        for (const item of items) {
            if (IGNORE_PATHS.has(item.name)) continue;

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

    logger.debug("[SyncFiles] Iniciando sincronización de archivos...");
    await scan("");
    logger.debug("[SyncFiles] Sincronización completada exitosamente.");
}