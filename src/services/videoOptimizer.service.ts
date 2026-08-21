import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { videoExts } from "../persistent/formats";
import { logger } from "../utils/logger";

// Configurar el ejecutable estático de FFmpeg
if (ffmpegInstaller) {
  ffmpeg.setFfmpegPath(ffmpegInstaller);
}

export interface VideoOptimizationResult {
  success: boolean;
  optimized: boolean;
  thumbnailPath?: string;
  error?: string;
}

/**
 * Verifica si la extensión corresponde a un archivo de video soportado.
 */
export function isVideoFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return videoExts.includes(ext);
}

/**
 * Optimiza un video utilizando fluent-ffmpeg y ffmpeg-static:
 * Aplica -movflags +faststart para mover los metadatos (moov atom) al inicio del archivo
 * permitiendo streaming instantáneo en el navegador. Transcodifica a H.264/AAC si el formato no es MP4.
 */
export function optimizeVideo(fullPath: string): Promise<VideoOptimizationResult> {
  return new Promise((resolve) => {
    if (!isVideoFile(fullPath)) {
      return resolve({ success: false, optimized: false, error: "No es un archivo de video soportado" });
    }

    if (!fs.existsSync(fullPath)) {
      return resolve({ success: false, optimized: false, error: "El archivo de video no existe" });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const dir = path.dirname(fullPath);
    const baseName = path.basename(fullPath, ext);
    const tempPath = path.join(dir, `${baseName}_faststart_tmp.mp4`);

    logger.info(`[FLUENT-FFMPEG] Iniciando optimización de video (+faststart): ${path.basename(fullPath)}`);

    const command = ffmpeg(fullPath);

    if (ext === ".mp4") {
      // Si ya es MP4, copiamos streams sin re-codificación (-c copy) y aplicamos +faststart
      command
        .videoCodec("copy")
        .audioCodec("copy")
        .outputOptions("-movflags +faststart");
    } else {
      // Si es formato contenedor no nativo web (.mkv, .avi, .mov), transcodificamos a H.264 / AAC
      command
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions([
          "-preset superfast",
          "-crf 23",
          "-b:a 128k",
          "-movflags +faststart"
        ]);
    }

    command
      .output(tempPath)
      .on("start", (cmdLine: string) => {
        logger.info(`[FLUENT-FFMPEG] Comando ejecutado: ${cmdLine}`);
      })
      .on("end", () => {
        if (fs.existsSync(tempPath)) {
          const targetPath = ext === ".mp4" ? fullPath : path.join(dir, `${baseName}.mp4`);
          if (targetPath !== fullPath && fs.existsSync(fullPath)) {
            try { fs.unlinkSync(fullPath); } catch (e) { }
          }
          fs.renameSync(tempPath, targetPath);
          logger.info(`[FLUENT-FFMPEG] Optimización (+faststart) completada con éxito: ${path.basename(targetPath)}`);
          resolve({ success: true, optimized: true });
        } else {
          resolve({ success: false, optimized: false, error: "No se generó el archivo de salida" });
        }
      })
      .on("error", (err: Error) => {
        logger.error(`[FLUENT-FFMPEG] Error durante la optimización (${baseName}): ${err.message}`);
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch (e) { }
        }
        resolve({ success: false, optimized: false, error: err.message });
      })
      .run();
  });
}

/**
 * Genera una miniatura (thumbnail) del video en formato PNG a partir del 5% del tiempo del video.
 */
export function generateVideoThumbnail(fullPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isVideoFile(fullPath) || !fs.existsSync(fullPath)) {
      return resolve(null);
    }

    const dir = path.dirname(fullPath);
    const baseName = path.basename(fullPath, path.extname(fullPath));
    const thumbName = `${baseName}_thumb.png`;
    const thumbPath = path.join(dir, "thumbnails");
    fs.mkdirSync(thumbPath, { recursive: true });

    ffmpeg(fullPath)
      .on("end", () => {
        const fullThumbFile = path.join(thumbPath, thumbName);
        logger.info(`[FLUENT-FFMPEG] Miniatura generada: ${thumbName}`);
        resolve(fullThumbFile);
      })
      .on("error", (err: Error) => {
        logger.warn(`[FLUENT-FFMPEG] No se pudo generar la miniatura para ${baseName}: ${err.message}`);
        resolve(null);
      })
      .screenshots({
        count: 1,
        timestamps: ["5%"],
        filename: thumbName,
        folder: thumbPath,
        size: "320x?"
      });
  });
}

/**
 * Obtiene la ruta del archivo de miniatura de un video. Si no existe, la genera al vuelo.
 */
export async function getVideoThumbnail(fullPath: string): Promise<string | null> {
  if (!isVideoFile(fullPath) || !fs.existsSync(fullPath)) return null;

  const dir = path.dirname(fullPath);
  const baseName = path.basename(fullPath, path.extname(fullPath));
  const thumbName = `${baseName}_thumb.png`;
  const thumbFolder = path.join(dir, "thumbnails");
  const thumbFile = path.join(thumbFolder, thumbName);

  if (fs.existsSync(thumbFile)) {
    return thumbFile;
  }

  return await generateVideoThumbnail(fullPath);
}

/**
 * Procesa de forma asíncrona en segundo plano los videos subidos.
 */
export function processUploadedVideosAsync(files: Express.Multer.File[], relativePath: string): void {
  const { getBaseDir } = require("../utils/settings");
  const baseDir = getBaseDir();

  setImmediate(async () => {
    for (const file of files) {
      const fullPath = path.join(baseDir, relativePath, file.filename);
      if (isVideoFile(fullPath)) {
        await optimizeVideo(fullPath);
        await generateVideoThumbnail(fullPath);
      }
    }
  });
}
