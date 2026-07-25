import fs from "fs/promises";
import path from "path";

// Limitador de concurrencia para evitar el error EMFILE (too many open files)
class ConcurrencyLimiter {
  private active = 0;
  private queue: (() => void)[] = [];
  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

/**
 * Calcula de forma paralela y recursiva el tamaño total de un directorio en bytes.
 * Gestiona errores de permisos de archivos y carpetas individuales de forma independiente.
 *
 * @param dirPath Ruta absoluta del directorio a calcular
 * @returns Promesa con el tamaño total en bytes
 */
export const calculateDirSize = async (dirPath: string): Promise<number> => {
  const limiter = new ConcurrencyLimiter(150); // Límite global de operaciones FS concurrentes

  const worker = async (currentPath: string): Promise<number> => {
    try {
      const stats = await limiter.run(() => fs.stat(currentPath));
      if (!stats.isDirectory()) {
        return stats.size;
      }

      const files = await limiter.run(() => fs.readdir(currentPath, { withFileTypes: true }));
      const promises = files.map(async (file) => {
        const fullPath = path.join(currentPath, file.name);
        console.log(fullPath);
        try {
          if (file.isDirectory()) {
            return await worker(fullPath);
          } else if (file.isFile()) {
            const fileStats = await limiter.run(() => fs.stat(fullPath));
            return fileStats.size;
          }
        } catch {
          // Ignorar archivos individuales ilegibles, sin permisos o enlaces rotos
        }
        return 0;
      });

      const sizes = await Promise.all(promises);
      return sizes.reduce((acc, curr) => acc + curr, 0);
    } catch {
      // Ignorar directorios individuales inaccesibles (EACCES, EPERM)
      return 0;
    }
  };

  return worker(dirPath);
};

const dir = "/";
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
