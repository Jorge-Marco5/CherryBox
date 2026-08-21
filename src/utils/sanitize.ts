import path from "path";

/**
 * Sanitiza el nombre de un archivo o carpeta individual eliminando o reemplazando
 * caracteres reservados o conflictivos en la Web, URLs y sistemas de archivos (Linux, Windows, macOS):
 * - Reemplaza caracteres conflictivos en URLs/Sistemas de archivos (#, %, &, ?, +, :, *, ", <, >, |, \, /, $, ~, `) por '_'
 * - Reemplaza múltiples puntos seguidos para prevenir vulnerabilidades de path traversal (ej: '..' o '...')
 * - Mantiene letras Unicode, acentos, números, espacios, guiones y puntos normales de extensión.
 * 
 * @param {string} name - Nombre original del archivo o carpeta.
 * @returns {string} Nombre sanitizado y seguro para BD, sistema de archivos y URLs.
 */
export function sanitizeName(name: string): string {
  if (!name) return "";

  // 1. Normalizar formato Unicode (NFC)
  let clean = name.normalize("NFC");

  // 2. Reemplazar slashes y caracteres que rompen URLs o sistemas de archivos
  // (incluyendo # % & ? + : * " < > | \ / $ ~ `)
  clean = clean.replace(/[\/\\:*?"<>|#%&+$~`]/g, "_");

  // 3. Eliminar caracteres de control NUL o no imprimibles
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "");

  // 4. Prevenir secuencias de múltiple punto (ej: "..", "...") reemplazándolas por un solo punto
  clean = clean.replace(/\.{2,}/g, ".");

  // 5. Eliminar puntos y espacios sobrantes al inicio o final del nombre
  clean = clean.trim().replace(/^[\.\s]+|[\.\s]+$/g, "");

  // Fallback si el nombre queda completamente vacío tras la sanitización
  return clean || "sin_titulo";
}

/**
 * Sanitiza una ruta relativa completa (ej: "Carpeta R&B/Subcarpeta #1/archivo.mp4")
 * preservando la jerarquía de subcarpetas (separadas por '/').
 * 
 * @param {string} relativePath - Ruta relativa completa.
 * @returns {string} Ruta relativa sanitizada.
 */
export function sanitizeRelativePath(relativePath: string): string {
  if (!relativePath) return "";

  const segments = relativePath.split(/[/\\]+/).filter(Boolean);
  const cleanSegments = segments.map((segment) => sanitizeName(segment));
  return cleanSegments.join("/");
}

/**
 * Codifica de forma segura una ruta relativa para uso en parámetros HTTP Query.
 * Codifica cada segmento de la ruta individualmente para mantener los slashes '/' intactos
 * y prevenir que caracteres como '#', '&', '?' o espacios rompan las solicitudes HTTP.
 * 
 * @param {string} relativePath - Ruta relativa.
 * @returns {string} Ruta codificada lista para URLs.
 */
export function encodePath(relativePath: string): string {
  if (!relativePath) return "";
  const segments = relativePath.split("/").filter(Boolean);
  return segments.map((segment) => encodeURIComponent(segment)).join("/");
}

/**
 * Decodifica de forma segura una ruta relativa que fue codificada con encodePath.
 * Mantiene la jerarquía de subcarpetas (separadas por '/').
 * 
 * @param {string} relativePath - Ruta relativa codificada.
 * @returns {string} Ruta relativa decodificada.
 */
export function decodePath(relativePath: string): string {
  if (!relativePath) return "";
  return relativePath.split("/").map((segment) => decodeURIComponent(segment)).join("/");
}