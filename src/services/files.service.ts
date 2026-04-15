import fs from "fs/promises";
import path from "path";
import { getBaseDir } from "../utils/settings";
import { isValidPath } from "../utils/multer";
import { logger } from "../utils/logger";
import { prisma } from "../lib/prisma";
import { AccessType, FileType } from "../generated/prisma/enums";
import { ForbiddenError, ValidationError, NotFoundError } from "../utils/errors";

const BASE_DIR = getBaseDir();

/**
 * Versión interna de checkPermission que devuelve booleano.
 */
async function hasAccess(userId: string, userRole: string, relativePath: string, access: AccessType): Promise<boolean> {
    if (userRole === "ADMIN" || userRole === "SUPERADMIN") return true;

    const parts = relativePath.split(path.sep).filter(p => p !== "");
    const pathsToCheck = [""];
    let current = "";
    for (const part of parts) {
        current = path.join(current, part);
        pathsToCheck.push(current);
    }

    const filesInPath = await prisma.file.findMany({
        where: { path: { in: pathsToCheck } },
        include: { permissions: { where: { userId } } }
    });

    // REGLA DE SEGURIDAD: Los ADMIN no pueden modificar (WRITE/DELETE) archivos del SUPERADMIN
    // El Superadmin es intocable según las reglas globales.
    if (userRole === "ADMIN" && (access === "WRITE" || access === "DELETE")) {
        const targetFile = filesInPath.find(f => f.path === relativePath);
        if (targetFile && targetFile.ownerId) {
            const owner = await prisma.user.findUnique({ where: { id: targetFile.ownerId } });
            if (owner?.role === "SUPERADMIN") return false;
        }
    }

    for (const file of filesInPath) {
        if (file.ownerId === userId) return true;
        const hasExactAccess = file.permissions.some(p => p.access === access || p.access === "MANAGE");
        if (hasExactAccess) return true;
    }

    return false;
}

/**
 * Valida si un usuario tiene el permiso necesario. Lanza error si no.
 */
async function checkPermission(userId: string, userRole: string, relativePath: string, access: AccessType) {
    const allowed = await hasAccess(userId, userRole, relativePath, access);
    if (!allowed) throw new ForbiddenError(`Permiso denegado: se requiere ${access} para esta ruta.`);
}

/**
 * Sincroniza una operación física con la base de datos.
 */
async function syncFileInDb(relativePath: string, action: 'CREATE' | 'DELETE' | 'UPDATE', data?: any) {
    if (action === 'DELETE') {
        const file = await prisma.file.findUnique({ where: { path: relativePath } });
        if (file) {
            // Eliminar recursivamente en la DB si es carpeta
            await prisma.file.delete({ where: { id: file.id } });
        }
    } else if (action === 'CREATE') {
        const parentPath = path.dirname(relativePath);
        const parent = parentPath === "." ? null : await prisma.file.findUnique({ where: { path: parentPath === "/" ? "" : parentPath } });

        await prisma.file.upsert({
            where: { path: relativePath },
            update: { ...data, parentId: parent?.id },
            create: {
                ...data,
                path: relativePath,
                name: path.basename(relativePath),
                parentId: parent?.id
            }
        });
    }
}

export const listItemsService = async (relativePath: string, userId: string, userRole: string) => {
    if (!isValidPath(relativePath)) throw new ValidationError("Ruta no válida");

    // Asegurar que la raíz existe
    if (relativePath === "") {
        const superadmin = await prisma.user.findFirst({ where: { role: "SUPERADMIN" } });
        await prisma.file.upsert({
            where: { path: "" },
            update: {},
            create: { path: "", name: "Inicio", type: "FOLDER", ownerId: superadmin?.id || userId }
        });
    }

    // 1. Verificar si tiene acceso READ directo o heredado al directorio
    const hasDirectAccess = await hasAccess(userId, userRole, relativePath, "READ");

    // 2. Si no tiene acceso directo, verificar si tiene acceso a algún descendiente
    // Esto permite "ver" la carpeta para poder navegar hacia abajo.
    let isPathDiscoverable = hasDirectAccess;
    if (!isPathDiscoverable && userRole === "USER") {
        const subtreeAccess = await prisma.file.findFirst({
            where: {
                path: { startsWith: relativePath + (relativePath === "" ? "" : path.sep) },
                OR: [
                    { ownerId: userId },
                    { permissions: { some: { userId } } }
                ]
            }
        });
        isPathDiscoverable = !!subtreeAccess;
    }

    if (!isPathDiscoverable) throw new ForbiddenError("Permiso denegado: no tienes acceso a esta ubicación.");

    const fullPath = path.join(BASE_DIR, relativePath);
    const items = await fs.readdir(fullPath, { withFileTypes: true });
    const currentFolder = await prisma.file.findUnique({ where: { path: relativePath }, select: { id: true, name: true } });

    const results = await Promise.allSettled(
        items.map(async (item) => {
            const relItemPath = path.join(relativePath, item.name);

            // FILTRADO: Si el usuario NO tiene acceso total al padre, solo mostrar lo que sea accesible
            if (!hasDirectAccess && userRole === "USER") {
                const canSeeItem = await hasAccess(userId, userRole, relItemPath, "READ");
                const canDiscoverDeep = !canSeeItem && item.isDirectory() && await prisma.file.findFirst({
                    where: {
                        path: { startsWith: relItemPath + path.sep },
                        OR: [
                            { ownerId: userId },
                            { permissions: { some: { userId } } }
                        ]
                    }
                });

                if (!canSeeItem && !canDiscoverDeep) return null;
            }

            try {
                const [stats, dbFile] = await Promise.all([
                    fs.stat(path.join(fullPath, item.name)),
                    prisma.file.findUnique({ where: { path: relItemPath }, select: { id: true } })
                ]);

                return {
                    id: dbFile?.id,
                    name: item.name,
                    type: item.isDirectory() ? 'folder' : 'file',
                    size: stats.size,
                    modified: stats.mtime,
                    path: relItemPath
                };
            } catch {
                return null;
            }
        })
    );

    return {
        currentFolderId: currentFolder?.id,
        currentFolderName: currentFolder?.name || "Inicio",
        files: results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value)
    };
};

export const searchItemsService = async (query: string, userId: string, userRole: string) => {
    // Optimización: Si no es admin, obtener todos los IDs de archivos/carpetas a los que tiene acceso
    // para filtrar la búsqueda en una sola pasada de base de datos si es posible, 
    // o al menos mitigar la recursividad infinita.

    const results: any[] = [];
    const searchRecursive = async (currentDir: string) => {
        const fullPath = path.join(BASE_DIR, currentDir);
        let items;
        try {
            items = await fs.readdir(fullPath, { withFileTypes: true });
        } catch { return; }

        for (const item of items) {
            const relPath = path.join(currentDir, item.name);

            // Verificación de acceso rápida
            const allowed = await hasAccess(userId, userRole, relPath, "READ");
            if (!allowed) continue;

            if (item.name.toLowerCase().includes(query.toLowerCase())) {
                try {
                    const stats = await fs.stat(path.join(BASE_DIR, relPath));
                    const dbFile = await prisma.file.findUnique({ where: { path: relPath }, select: { id: true } });

                    results.push({
                        id: dbFile?.id,
                        name: item.name,
                        type: item.isDirectory() ? 'folder' : 'file',
                        size: stats.size,
                        modified: stats.mtime,
                        path: relPath
                    });
                } catch { }
            }
            if (item.isDirectory()) await searchRecursive(relPath);
        }
    };

    await searchRecursive('');
    return results;
};

export const createFolderService = async (relativePath: string, name: string, userId: string, userRole: string) => {
    if (!isValidPath(relativePath)) throw new ValidationError("Ruta no válida");

    // Necesita WRITE en la carpeta padre
    await checkPermission(userId, userRole, relativePath, "WRITE");

    const newRelPath = path.join(relativePath, name);
    const fullPath = path.join(BASE_DIR, newRelPath);
    await fs.mkdir(fullPath, { recursive: true });

    await syncFileInDb(newRelPath, 'CREATE', { type: 'FOLDER', ownerId: userId });
    return { success: true, message: 'Carpeta creada' };
};

export const renameItemService = async (oldPath: string, newName: string, userId: string, userRole: string) => {
    if (!isValidPath(oldPath)) throw new ValidationError("Ruta no válida");

    // Necesita WRITE en el ítem actual
    await checkPermission(userId, userRole, oldPath, "WRITE");

    const oldFullPath = path.join(BASE_DIR, oldPath);
    const newRelPath = path.join(path.dirname(oldPath), newName);
    const newFullPath = path.join(BASE_DIR, newRelPath);

    await fs.rename(oldFullPath, newFullPath);

    // Sincronizar (Borrar viejo, Crear nuevo)
    const oldFile = await prisma.file.findUnique({ where: { path: oldPath } });
    await syncFileInDb(oldPath, 'DELETE');
    await syncFileInDb(newRelPath, 'CREATE', {
        type: oldFile?.type || 'FILE',
        ownerId: oldFile?.ownerId || userId
    });

    return { success: true, message: 'Renombrado exitosamente' };
};

export const deleteItemService = async (relativePath: string, userId: string, userRole: string) => {
    if (!isValidPath(relativePath)) throw new ValidationError("Ruta no válida");

    // Necesita DELETE en el ítem
    await checkPermission(userId, userRole, relativePath, "DELETE");

    const fullPath = path.join(BASE_DIR, relativePath);
    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
    } else {
        await fs.unlink(fullPath);
    }

    await syncFileInDb(relativePath, 'DELETE');
    return { success: true, message: 'Eliminado exitosamente', isDirectory: stats.isDirectory() };
};

export const getItemContentService = async (relativePath: string, userId: string, userRole: string) => {
    if (!isValidPath(relativePath)) throw new ValidationError("Ruta no válida");

    // Necesita READ
    await checkPermission(userId, userRole, relativePath, "READ");

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

    throw new ValidationError("Tipo de archivo no soportado para vista previa");
};

// Nueva función para el controlador de subida (que multer maneja físicamente)
export const registerUploadedFilesService = async (files: any[], relativePath: string, userId: string) => {
    for (const file of files) {
        const relPath = path.join(relativePath, file.filename);
        await syncFileInDb(relPath, 'CREATE', { type: 'FILE', ownerId: userId });
    }
};

