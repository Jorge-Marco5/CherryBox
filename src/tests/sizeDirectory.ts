import fs from "fs/promises";
import path from "path";

/**
 * Calcula de forma recursiva el tamaño total de un directorio en bytes.
 *
 * @param dirPath Ruta absoluta del directorio a calcular
 * @returns Promesa con el tamaño total en bytes
 */
export const calculateDirSize = async (dirPath: string): Promise<number> => {
  let size = 0;
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return stats.size; // Si es un archivo, devuelve su tamaño directamente
    }

    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += await calculateDirSize(fullPath);
      } else {
        const fileStats = await fs.stat(fullPath);
        size += fileStats.size;
      }
    }
  } catch (error) {
    console.log(`Error calculating size for ${dirPath}:`, error);
    return 0;
  }
  return size;
};

const dir = "/home/jorgemarcos/Documentos/archivos";
calculateDirSize(dir)
  .then((resultado) => console.log("Peso total: " + formatBytes(resultado) + "\nValor default: " + resultado))
  .catch((err) => console.error(err));

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // Asegurarse de que 'i' no exceda el índice máximo de 'sizes'
  const index = Math.min(i, sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[index];
}
