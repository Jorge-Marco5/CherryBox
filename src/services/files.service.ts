import fs from "fs/promises";
import path from "path";
import { AccessType } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { audioExts, codeExts, imageExts, pdfExts, textExts, videoExts } from "../persistent/formats";
import { ForbiddenError, ValidationError } from "../utils/errors";
import { isValidPath } from "../utils/multer";
import { getBaseDir } from "../utils/settings";
import { sanitizeName, decodePath } from "../utils/sanitize";
import videoHandler from "./videostream.service";
import { getVideoThumbnail } from "./videoOptimizer.service";

/**
 * Evalúa si un nivel de acceso concedido satisface la acción solicitada.
 * Implementa una jerarquía implícita donde:
 * - Cualquier permiso (READ, WRITE, DELETE, MANAGE) incluye lectura (READ).
 * - MANAGE tiene acceso total a cualquier acción.
 */
function satisfiesAccess(granted: AccessType, requested: AccessType): boolean {
  if (granted === "MANAGE") return true;
  if (requested === "READ") return true; // Cualquier permiso otorgado permite leer
  if (requested === "WRITE" && granted === "WRITE") return true;
  if (requested === "DELETE" && granted === "DELETE") return true;
  return false;
}

/**
 * Versión interna de checkPermission que devuelve booleano.
 */
export async function hasAccess(userId: string, userRole: string, relativePath: string, access: AccessType): Promise<boolean> {
  const parts = relativePath.split(path.sep).filter((p) => p !== "");
  const pathsToCheck = [""];
  let current = "";
  for (const part of parts) {
    current = path.join(current, part);
    pathsToCheck.push(current);
  }

  const filesInPath = await prisma.file.findMany({
    where: { path: { in: pathsToCheck } },
    include: { permissions: { where: { userId } } },
  });

  const targetFile = filesInPath.find((f) => f.path === relativePath);

  // 1. Si el usuario es dueño directo de algún elemento en la ruta, tiene acceso
  const ownedFile = filesInPath.find((f) => f.ownerId === userId);
  if (ownedFile) return true;

  // 2. Si tiene un permiso explícito otorgado en la ruta que satisface la acción
  const hasExplicitPermission = filesInPath.some((file) =>
    file.permissions.some((p) => {
      // Caso especial: si se requiere READ, pero el permiso otorgado es WRITE o DELETE (Drop Box/Blind Submit):
      // Solo permitimos la lectura de la carpeta raíz (para navegación) o si es dueño directo del archivo.
      if (access === "READ" && (p.access === "WRITE" || p.access === "DELETE")) {
        const isDirectory = targetFile?.type === "FOLDER" || !targetFile;
        const isOwner = targetFile?.ownerId === userId;
        return isDirectory || isOwner;
      }
      return satisfiesAccess(p.access, access);
    })
  );
  if (hasExplicitPermission) return true;

  // 3. Bloquear sobreescritura de archivos de otros usuarios en carpetas compartidas con WRITE (Drop Box)
  if (access === "WRITE" && targetFile && targetFile.ownerId !== userId && userRole === "USER") {
    const hasManageOnTarget = targetFile.permissions.some(p => p.access === "MANAGE");
    if (!hasManageOnTarget) {
      return false;
    }
  }

  // 4. Si no es dueño ni tiene permiso explícito, validamos según el rol:
  // - El SUPERADMIN tiene acceso total por defecto
  if (userRole === "SUPERADMIN") return true;

  // - El ADMIN tiene acceso total por defecto, EXCEPTO en archivos propiedad del SUPERADMIN
  if (userRole === "ADMIN") {
    if (access === "WRITE" || access === "DELETE" || access === "MANAGE") {
      let checkFile = targetFile;
      if (!checkFile && parts.length > 0) {
        const parentPath = path.dirname(relativePath);
        const resolvedParentPath = parentPath === "." || parentPath === "/" ? "" : parentPath;
        checkFile = filesInPath.find((f) => f.path === resolvedParentPath);
      }

      if (checkFile && checkFile.ownerId) {
        const owner = await prisma.user.findUnique({ where: { id: checkFile.ownerId } });
        if (owner?.role === "SUPERADMIN") {
          return false; // Bloqueado: el Superadmin es intocable sin permiso explícito
        }
      }
    }
    return true; // Permitido para otros archivos
  }

  return false;
}

/**
 * Valida si un usuario tiene el permiso necesario. Lanza error si no.
 */
export async function checkPermission(userId: string, userRole: string, relativePath: string, access: AccessType) {
  const allowed = await hasAccess(userId, userRole, relativePath, access);
  if (!allowed) throw new ForbiddenError(`Permiso denegado: se requiere ${access} para esta ruta.`);
}

/**
 * Sincroniza una operación física con la base de datos.
 */
async function syncFileInDb(relativePath: string, action: "CREATE" | "DELETE" | "UPDATE", data?: any) {
  if (action === "DELETE") {
    const file = await prisma.file.findUnique({ where: { path: relativePath } });
    if (file) {
      // Eliminar recursivamente en la DB si es carpeta
      await prisma.file.delete({ where: { id: file.id } });
    }
  } else if (action === "CREATE") {
    const parentPath = path.dirname(relativePath);
    const parent =
      parentPath === "."
        ? null
        : await prisma.file.findUnique({ where: { path: parentPath === "/" ? "" : parentPath } });

    await prisma.file.upsert({
      where: { path: relativePath },
      update: { ...data, parentId: parent?.id },
      create: {
        ...data,
        path: relativePath,
        name: path.basename(relativePath),
        parentId: parent?.id,
      },
    });
  }
}

export const listItemsService = async (relativePath: string, userId: string, userRole: string) => {
  if (!isValidPath(relativePath)) throw new ValidationError("Ruta no válida");
  const BASE_DIR = getBaseDir();
  // Asegurar que la raíz existe
  if (relativePath === "") {
    const superadmin = await prisma.user.findFirst({ where: { role: "SUPERADMIN" } });
    await prisma.file.upsert({
      where: { path: "" },
      update: {},
      create: { path: "", name: "Inicio", type: "FOLDER", ownerId: superadmin?.id || userId },
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
        OR: [{ ownerId: userId }, { permissions: { some: { userId } } }],
      },
    });
    isPathDiscoverable = !!subtreeAccess;
  }

  if (!isPathDiscoverable) throw new ForbiddenError("Permiso denegado: no tienes acceso a esta ubicación.");

  // Obtener ancestros para verificar si el usuario tiene permiso explícito READ o MANAGE
  const parts = relativePath.split(path.sep).filter((p) => p !== "");
  const pathsToCheck = [""];
  let current = "";
  for (const part of parts) {
    current = path.join(current, part);
    pathsToCheck.push(current);
  }

  const filesInPathForList = await prisma.file.findMany({
    where: { path: { in: pathsToCheck } },
    include: { permissions: { where: { userId } } },
  });

  const hasReadOrManage = userRole === "SUPERADMIN" || userRole === "ADMIN" || filesInPathForList.some(file =>
    file.ownerId === userId ||
    file.permissions.some(p => p.access === "READ" || p.access === "MANAGE")
  );

  const fullPath = path.join(BASE_DIR, relativePath);
  const items = await fs.readdir(fullPath, { withFileTypes: true });
  const currentFolder = await prisma.file.findUnique({
    where: { path: relativePath },
    select: { id: true, name: true },
  });

  const results = await Promise.allSettled(
    items.map(async (item) => {
      const relItemPath = path.join(relativePath, item.name);

      // FILTRADO: Si el usuario NO tiene acceso total al padre, solo mostrar lo que sea accesible
      if (!hasDirectAccess && userRole === "USER") {
        const canSeeItem = await hasAccess(userId, userRole, relItemPath, "READ");
        const canDiscoverDeep =
          !canSeeItem &&
          item.isDirectory() &&
          (await prisma.file.findFirst({
            where: {
              path: { startsWith: relItemPath + path.sep },
              OR: [{ ownerId: userId }, { permissions: { some: { userId } } }],
            },
          }));

        if (!canSeeItem && !canDiscoverDeep) return null;
      }

      try {
        const [stats, dbFile] = await Promise.all([
          fs.stat(path.join(fullPath, item.name)),
          prisma.file.findUnique({ where: { path: relItemPath }, select: { id: true, folder_color: true, ownerId: true } }),
        ]);

        // Si el usuario no tiene READ o MANAGE (es decir, solo tiene WRITE o DELETE en la carpeta),
        // solo puede ver y listar sus propios archivos/carpetas creadas por él.
        if (!hasReadOrManage && userRole === "USER") {
          if (dbFile?.ownerId !== userId) {
            return null; // Ocultar archivos y carpetas de otros usuarios
          }
        }

        return {
          id: dbFile?.id,
          name: item.name,
          folder_color: dbFile?.folder_color,
          type: item.isDirectory() ? "folder" : "file",
          size: stats.size,
          modified: stats.mtime,
          path: relItemPath,
        };
      } catch {
        return null;
      }
    }),
  );
  return {
    currentFolderId: currentFolder?.id,
    currentFolderName: currentFolder?.name || "Inicio",
    files: results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value)
      //ordena los resultados primero por tipo (folders y despues archivos) y despues por orden alfabetico
      .sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      }),
  };
};

export const searchItemsService = async (query: string, userId: string, userRole: string) => {
  const BASE_DIR = getBaseDir();
  const results: any[] = [];
  const searchRecursive = async (currentDir: string) => {
    const fullPath = path.join(BASE_DIR, currentDir);
    let items;
    try {
      items = await fs.readdir(fullPath, { withFileTypes: true });
    } catch {
      return;
    }

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
            type: item.isDirectory() ? "folder" : "file",
            size: stats.size,
            modified: stats.mtime,
            path: relPath,
          });
        } catch { }
      }
      if (item.isDirectory()) await searchRecursive(relPath);
    }
  };

  await searchRecursive("");
  return results;
};

export const createFolderService = async (
  relativePath: string,
  name: string,
  folder_color: string,
  userId: string,
  userRole: string,
) => {
  if (!isValidPath(relativePath)) throw new ValidationError("Ruta no válida");
  const BASE_DIR = getBaseDir();
  // Necesita WRITE en la carpeta padre
  await checkPermission(userId, userRole, relativePath, "WRITE");

  const cleanName = sanitizeName(name);
  if (!cleanName) throw new ValidationError("Nombre de carpeta no válido");

  const newRelPath = path.join(relativePath, cleanName);
  const fullPath = path.join(BASE_DIR, newRelPath);
  await fs.mkdir(fullPath, { recursive: true });

  await syncFileInDb(newRelPath, "CREATE", { type: "FOLDER", ownerId: userId, folder_color: folder_color });
  return { success: true, message: "Carpeta creada" };
};

export const renameItemService = async (
  oldPath: string,
  newName: string,
  folderColor: string,
  userId: string,
  userRole: string,
) => {
  if (!isValidPath(oldPath)) throw new ValidationError("Ruta no válida");
  const BASE_DIR = getBaseDir();

  const oldFile = await prisma.file.findUnique({ where: { path: oldPath } });
  if (!oldFile) throw new ValidationError(`El archivo o carpeta no existe: ${oldPath}`);

  if (oldFile.ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: oldFile.ownerId } });
    if (owner?.role === "SUPERADMIN" && userRole !== "SUPERADMIN") {
      throw new ForbiddenError("No tienes permiso para renombrar este archivo.");
    }
  }

  if (userRole === "USER" && oldFile.ownerId !== userId) {
    throw new ForbiddenError("Solo puedes renombrar archivos y carpetas creados por ti.");
  }
  await checkPermission(userId, userRole, oldPath, "WRITE");

  const cleanNewName = sanitizeName(newName);
  if (!cleanNewName) throw new ValidationError("Nuevo nombre no válido");

  const oldFullPath = path.join(BASE_DIR, oldPath);
  const newRelPath = path.join(path.dirname(oldPath), cleanNewName);
  const newFullPath = path.join(BASE_DIR, newRelPath);

  await fs.rename(oldFullPath, newFullPath);

  // Sincronizar (Borrar viejo, Crear nuevo)
  await syncFileInDb(oldPath, "DELETE");
  await syncFileInDb(newRelPath, "CREATE", {
    type: oldFile.type,
    ownerId: oldFile.ownerId,
    folder_color: folderColor,
  });

  return { success: true, message: "Actualizado exitosamente" };
};

export const deleteItemService = async (relativePath: string, userId: string, userRole: string) => {
  if (!isValidPath(relativePath)) throw new ValidationError("Ruta no válida");
  const BASE_DIR = getBaseDir();

  const file = await prisma.file.findUnique({ where: { path: relativePath } });
  if (!file) throw new ValidationError("El archivo o carpeta no existe: " + relativePath);

  if (file.ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: file.ownerId } });
    if (owner?.role === "SUPERADMIN" && userRole !== "SUPERADMIN") {
      throw new ForbiddenError("No tienes permiso para eliminar este archivo.");
    }
  }

  if (userRole === "USER" && file.ownerId !== userId) {
    throw new ForbiddenError("Solo puedes eliminar archivos y carpetas creados por ti.");
  }

  await checkPermission(userId, userRole, relativePath, "DELETE");

  const fullPath = path.join(BASE_DIR, relativePath);
  const stats = await fs.stat(fullPath);

  let sizeDeleted = 0;
  if (stats.isDirectory()) {
    const { calculateDirSize } = require("../controllers/settings.controller");
    sizeDeleted = await calculateDirSize(fullPath);
    await fs.rm(fullPath, { recursive: true, force: true });
  } else {
    sizeDeleted = stats.size;
    await fs.unlink(fullPath);
  }

  await syncFileInDb(relativePath, "DELETE");

  const { subtractUsedStorage } = require("../utils/settings");
  await subtractUsedStorage(sizeDeleted);

  return { success: true, message: "Eliminado exitosamente", isDirectory: stats.isDirectory() };
};

export const getFormatsAvailables = async () => {
  return { audioExts, codeExts, imageExts, pdfExts, textExts, videoExts };
};

/**
 * Obtiene el contenido de un archivo o carpeta
 * @param relativePath Ruta relativa del archivo o carpeta
 * @param range Range header de la petición
 * @param userId ID del usuario
 * @param userRole Rol del usuario
 * @param isThumbnail ¿Es miniatura?
 * @returns Objeto con el contenido del archivo o carpeta
 */
export const getItemContentService = async (
  relativePath: string,
  range: string | undefined,
  userId: string,
  userRole: string,
  isThumbnail?: boolean,
) => {
  if (!isValidPath(relativePath)) throw new ValidationError("Ruta no válida");
  const BASE_DIR = getBaseDir();
  // Necesita READ
  await checkPermission(userId, userRole, relativePath, "READ");

  const fullPath = path.join(BASE_DIR, relativePath);
  const ext = path.extname(fullPath).toLowerCase();

  // Si se solicita específicamente la miniatura de un video
  if (isThumbnail && videoExts.includes(ext)) {
    const thumbPath = await getVideoThumbnail(fullPath);
    if (thumbPath) {
      try {
        const stats = await fs.stat(thumbPath);
        if (stats.isFile()) {
          return { type: "media", fullPath: thumbPath };
        }
      } catch (e) {
        // Fallback si falla stat
      }
    }
  }

  const textExtensions = [...codeExts, ...textExts];
  if (textExtensions.includes(ext)) {
    const content = await fs.readFile(fullPath, "utf-8");
    return { type: "text", content };
  }

  const mediaExtensions = [...imageExts, ...pdfExts, ...audioExts];
  if (mediaExtensions.includes(ext)) {
    return { type: "media", fullPath };
  }

  const videoExtensions = [...videoExts];
  if (videoExtensions.includes(ext)) {
    const content = await videoHandler(fullPath, range);
    return { type: "video", content };
  }

  throw new ValidationError("Tipo de archivo no soportado para vista previa");
};

export const registerUploadedFilesService = async (files: any[], relativePath: string, userId: string) => {
  for (const file of files) {
    console.log("relativePath: ", relativePath)
    const relPath = path.join(relativePath, file.filename);
    await syncFileInDb(relPath, "CREATE", { type: "FILE", ownerId: userId });
  }
};

export const verifyDownloadMultipleService = async (paths: string[], userId: string, userRole: string) => {
  const filePaths: string[] = [];
  let totalSize = 0;
  const BASE_DIR = getBaseDir();
  for (const relPath of paths) {
    if (!isValidPath(relPath)) throw new ValidationError(`Ruta no válida: ${relPath}`);

    // Verificar READ
    await checkPermission(userId, userRole, relPath, "READ");

    const fullPath = path.join(BASE_DIR, relPath);
    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      throw new ValidationError(`No se permite descargar carpetas en lote: ${relPath}`);
    }

    filePaths.push(fullPath);
    totalSize += stats.size;
  }

  // Límite de 100MB (100 * 1024 * 1024 bytes)
  const MAX_SIZE = 100 * 1024 * 1024;
  if (totalSize > MAX_SIZE) {
    throw new ValidationError(`El tamaño total (${(totalSize / 1024 / 1024).toFixed(2)}MB) excede el límite de 100MB.`);
  }

  return filePaths;
};
