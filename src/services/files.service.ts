import fs from "fs/promises";
import path from "path";
import { getBaseDir } from "../utils/settings";
import { isValidPath } from "../utils/multer";
import { logger } from "../utils/logger";

const BASE_DIR = getBaseDir();

export const listItemsService = async (relativePath: string) => {
    if (!isValidPath(relativePath)) {
        throw new Error("Ruta no válida");
    }

    const fullPath = path.join(BASE_DIR, relativePath);
    const items = await fs.readdir(fullPath, { withFileTypes: true });

    const results = await Promise.allSettled(
        items.map(async (item) => {
            const itemPath = path.join(fullPath, item.name);
            try {
                const stats = await fs.stat(itemPath);
                return {
                    name: item.name,
                    type: item.isDirectory() ? 'folder' : 'file',
                    size: stats.size,
                    modified: stats.mtime,
                    path: path.join(relativePath, item.name)
                };
            } catch (err: any) {
                logger.warn(`No se pudo obtener info de ${item.name}: ${err.message}`);
                return null;
            }
        })
    );

    return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);
};

export const searchItemsService = async (query: string) => {
    const results: any[] = [];
    const searchRecursive = async (currentDir: string) => {
        const fullPath = path.join(BASE_DIR, currentDir);
        const items = await fs.readdir(fullPath, { withFileTypes: true });

        for (const item of items) {
            const relativePath = path.join(currentDir, item.name);

            if (item.name.toLowerCase().includes(query.toLowerCase())) {
                try {
                    const stats = await fs.stat(path.join(BASE_DIR, relativePath));
                    results.push({
                        name: item.name,
                        type: item.isDirectory() ? 'folder' : 'file',
                        size: stats.size,
                        modified: stats.mtime,
                        path: relativePath
                    });
                } catch (err: any) {
                    logger.warn(`No se pudo obtener info durante búsqueda: ${err.message}`);
                }
            }

            if (item.isDirectory()) {
                await searchRecursive(relativePath);
            }
        }
    };

    await searchRecursive('');
    return results;
};

export const createFolderService = async (relativePath: string, name: string) => {
    if (!isValidPath(relativePath)) {
        throw new Error("Ruta no válida");
    }

    const fullPath = path.join(BASE_DIR, relativePath, name);
    await fs.mkdir(fullPath, { recursive: true });
    return { success: true, message: 'Carpeta creada' };
};

export const renameItemService = async (oldPath: string, newName: string) => {
    if (!isValidPath(oldPath)) {
        throw new Error("Ruta no válida");
    }

    const oldFullPath = path.join(BASE_DIR, oldPath);
    const newFullPath = path.join(path.dirname(oldFullPath), newName);

    try {
        await fs.access(oldFullPath);
    } catch {
        throw new Error("El archivo o carpeta no existe");
    }

    try {
        await fs.access(newFullPath);
        throw new Error("Ya existe un archivo con ese nombre");
    } catch {
        // Nombre disponible
    }

    await fs.rename(oldFullPath, newFullPath);
    return { success: true, message: 'Renombrado exitosamente' };
};

export const deleteItemService = async (relativePath: string) => {
    if (!isValidPath(relativePath)) {
        throw new Error("Ruta no válida");
    }

    const fullPath = path.join(BASE_DIR, relativePath);

    try {
        await fs.access(fullPath);
    } catch {
        throw new Error("El archivo o carpeta no existe");
    }

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
    } else {
        await fs.unlink(fullPath);
    }

    return { success: true, message: 'Eliminado exitosamente', isDirectory: stats.isDirectory() };
};

export const getItemContentService = async (relativePath: string) => {
    if (!isValidPath(relativePath)) {
        throw new Error("Ruta no válida");
    }

    const fullPath = path.join(BASE_DIR, relativePath);
    const ext = path.extname(fullPath).toLowerCase();

    const textExtensions = ['.txt', '.md', '.json', '.js', '.css', '.html', '.xml', '.csv'];
    if (textExtensions.includes(ext)) {
        const content = await fs.readFile(fullPath, 'utf-8');
        return { type: 'text', content };
    }

    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3', '.wav', '.pdf'];
    if (mediaExtensions.includes(ext)) {
        return { type: 'media', fullPath };
    }

    throw new Error("Tipo de archivo no soportado para vista previa");
};
