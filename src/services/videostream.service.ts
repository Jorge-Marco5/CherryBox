import path from "path";
import fs from "fs";
import { NotFoundError } from "../utils/errors";

export interface VideoStreamResult {
    status: number;
    headers: Record<string, string | number>;
    stream?: fs.ReadStream;
}

/**
 * Retorna el tipo MIME adecuado según la extensión del archivo de video.
 */
function getVideoMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case ".mp4": return "video/mp4";
        case ".webm": return "video/webm";
        case ".ogg":
        case ".ogv": return "video/ogg";
        case ".mov": return "video/quicktime";
        case ".mkv": return "video/x-matroska";
        case ".avi": return "video/x-msvideo";
        default: return "video/mp4";
    }
}

/**
 * Procesa la petición de streaming de video. Soporta Range Headers.
 * @param fullPath Ruta completa del archivo de video.
 * @param rangeHeader Range header de la petición.
 * @returns Objeto con status, headers y stream.
 */
async function videoHandler(fullPath: string, rangeHeader?: string): Promise<VideoStreamResult> {
    try {
        const resolvedPath = path.resolve(fullPath.toString());
        if (!fs.existsSync(resolvedPath)) {
            throw new NotFoundError(`Video no encontrado: ${resolvedPath}`);
        }

        const stat = fs.statSync(resolvedPath);
        const fileSize = stat.size;
        const mimeType = getVideoMimeType(resolvedPath);

        // Si el cliente no envía Range Header pero el video es de gran tamaño (> 10MB), forzamos streaming desde inicio (bytes=0-)
        let activeRange = rangeHeader;
        if (!activeRange && fileSize > 10 * 1024 * 1024) {
            activeRange = "bytes=0-";
        }

        // Si la solicitud incluye Range Header (o si se forzó para streaming)
        if (activeRange) {
            const parts = activeRange.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);

            // Validar si el rango solicitado está fuera de los límites del archivo
            if (isNaN(start) || start >= fileSize || start < 0) {
                return {
                    status: 416, // Range Not Satisfiable
                    headers: {
                        "Content-Range": `bytes */${fileSize}`,
                        "Accept-Ranges": "bytes",
                    },
                };
            }

            // Si el cliente no especifica el byte final (ej. bytes=start-), enviamos un chunk limitado (2MB)
            const defaultChunkSize = 4 * 1024 * 1024; // 2 MB
            const rawEnd = parts[1] ? parseInt(parts[1], 10) : start + defaultChunkSize - 1;
            let end = isNaN(rawEnd) ? start + defaultChunkSize - 1 : rawEnd;

            if (end >= fileSize) {
                end = fileSize - 1;
            }

            if (end < start) {
                end = start;
            }

            const chunkSize = (end - start) + 1;

            // Se utiliza highWaterMark de 64 KB. Node.js pausará automáticamente la lectura en disco (backpressure)
            // en cuanto el búfer del reproductor del cliente se llene, evitando transferencias innecesarias.
            const stream = fs.createReadStream(resolvedPath, {
                start,
                end,
                highWaterMark: 64 * 1024
            });

            //console.log(`[STREAMING 206] Rango: ${start}-${end}/${fileSize} | Tamaño respuesta: ${(chunkSize / (1024 * 1024)).toFixed(2)} MB | Archivo: ${path.basename(resolvedPath)}`);

            const headers = {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": mimeType,
            };

            return { status: 206, headers, stream };
        }

        // Peticiones directas completas para archivos pequeños
        const stream = fs.createReadStream(resolvedPath, { highWaterMark: 64 * 1024 });
        const headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": fileSize,
            "Content-Type": mimeType,
        };
        return { status: 200, headers, stream };
    } catch (error: any) {
        throw error;
    }
}

export default videoHandler;