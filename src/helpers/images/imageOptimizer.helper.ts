import sharp from "sharp";
import fs from "fs";
import path from "path";
import { imageExts } from "../../persistent/formats";
import { logger } from "../../utils/logger";
import { system_setting } from "../../config/config";

/**
 * Extensiones de imágenes rasterizadas soportadas para generación de miniaturas.
 */
const RASTER_IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".avif"
]);

/**
 * Verifica si la extensión corresponde a un archivo de imagen.
 */
export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return imageExts.includes(ext);
}

/**
 * Genera una miniatura optimizada en formato WebP en la carpeta 'thumbnails'.
 * Utiliza Sharp para redimensionar (máx 400x400), auto-orientar según EXIF
 * y comprimir a WebP con calidad 80%.
 */
export async function generateImageThumbnail(fullPath: string): Promise<string | null> {
  const ext = path.extname(fullPath).toLowerCase();

  // Los archivos SVG ya son vectoriales y livianos, no requieren miniatura rasterizada
  if (ext === ".svg") {
    return fullPath;
  }

  if (!RASTER_IMAGE_EXTS.has(ext) || !fs.existsSync(fullPath)) {
    return null;
  }

  const dir = path.dirname(fullPath);
  const baseName = path.basename(fullPath, ext);
  const thumbName = `${baseName}_thumb.webp`;
  const thumbFolder = path.join(dir, "thumbnails");
  const thumbPath = path.join(thumbFolder, thumbName);

  try {
    if (!fs.existsSync(thumbFolder)) {
      fs.mkdirSync(thumbFolder, { recursive: true });
    }

    await sharp(fullPath)
      .rotate() // Respeta la orientación EXIF de fotos tomadas con móviles/cámaras
      .resize({
        width: 400,
        height: 400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 4 })
      .toFile(thumbPath);

    logger.info(`[SHARP] Miniatura generada exitosamente: ${thumbName}`);
    return thumbPath;
  } catch (error: any) {
    logger.warn(`[SHARP] No se pudo generar la miniatura para ${baseName}: ${error.message}`);
    return null;
  }
}

/**
 * Obtiene la ruta del archivo de miniatura de una imagen. Si no existe, la genera al vuelo.
 */
export async function getImageThumbnail(fullPath: string): Promise<string | null> {
  const ext = path.extname(fullPath).toLowerCase();
  if (ext === ".svg") {
    return fullPath;
  }

  if (!RASTER_IMAGE_EXTS.has(ext) || !fs.existsSync(fullPath)) {
    return null;
  }

  const dir = path.dirname(fullPath);
  const baseName = path.basename(fullPath, ext);
  const thumbName = `${baseName}_thumb.webp`;
  const thumbFile = path.join(dir, "thumbnails", thumbName);

  if (fs.existsSync(thumbFile)) {
    return thumbFile;
  }

  return await generateImageThumbnail(fullPath);
}

/**
 * Procesa de forma asíncrona en segundo plano las imágenes subidas
 * para pregenerar sus miniaturas optimizadas.
 */
export function processUploadedImagesAsync(files: Express.Multer.File[], relativePath: string): void {
  const baseDir = system_setting.getBaseDir();

  setImmediate(async () => {
    for (const file of files) {
      const fullPath = path.join(baseDir, relativePath, file.filename);
      if (isImageFile(fullPath)) {
        await generateImageThumbnail(fullPath);
      }
    }
  });
}
