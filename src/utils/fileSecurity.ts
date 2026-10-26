import path from "path";

const getFileType = async () => (new Function('return import("file-type")')() as Promise<any>);

// Equivalencias directas de extensiones comunes
const EXT_ALIASES: Record<string, string[]> = {
  jpg: ["jpg", "jpeg"],
  jpeg: ["jpg", "jpeg"],
  mp4: ["mp4", "m4v"],
  m4v: ["mp4", "m4v"],
  webm: ["webm", "mkv"],
  mkv: ["webm", "mkv"],
  tif: ["tif", "tiff"],
  tiff: ["tif", "tiff"],
  gz: ["gz", "tgz", "tar.gz"],
};

// Extensiones ejecutables prohibidas
const BLOCKED_EXTS = new Set(["exe", "bat", "cmd", "php", "dll", "vbs", "ps1", "msi", "com", "cgi"]);

// Extensiones de texto o código válidas sin firma binaria
const TEXT_EXTS = new Set([
  "txt", "md", "json", "js", "ts", "css", "html", "xml", "csv", "svg", "sql", "sh", "env", "yml", "yaml", "log"
]);

export interface FileAnalysisResult {
  isValid: boolean;
  detectedType?: string;
  detectedExt?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Analiza y compara la firma binaria del archivo con su extensión declarada.
 * Si no coincide o es un binario ejecutable peligroso, se descarta por completo.
 */
export async function analyzeFileSafety(
  filePath: string,
  filename: string
): Promise<FileAnalysisResult> {
  const ext = path.extname(filename).toLowerCase().replace(".", "");

  // 1. Descartar extensiones ejecutables prohibidas
  if (BLOCKED_EXTS.has(ext)) {
    return { isValid: false, error: `Extensión no permitida por seguridad: .${ext}` };
  }

  const { fileTypeFromFile } = await getFileType();
  const detected = await fileTypeFromFile(filePath);

  // 2. Si tiene firma binaria, validar que coincida con la extensión
  if (detected) {
    if (BLOCKED_EXTS.has(detected.ext)) {
      return { isValid: false, error: `Contenido binario ejecutable no permitido (.${detected.ext})` };
    }

    const validExts = EXT_ALIASES[ext] || [ext];
    if (!validExts.includes(detected.ext)) {
      return {
        isValid: false,
        error: `Discrepancia: la extensión .${ext} no coincide con el contenido binario detectado (.${detected.ext})`,
      };
    }

    return {
      isValid: true,
      detectedType: detected.mime.split("/")[0] || detected.ext,
      detectedExt: detected.ext,
      mimeType: detected.mime,
    };
  }

  // 3. Si no tiene firma binaria, solo se admiten formatos de texto conocidos
  if (!TEXT_EXTS.has(ext)) {
    return {
      isValid: false,
      error: `El archivo .${ext} no contiene una firma binaria válida o está dañado.`,
    };
  }

  return {
    isValid: true,
    detectedType: "text",
    detectedExt: ext,
    mimeType: "text/plain",
  };
}
