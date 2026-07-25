import fs from "fs/promises";
import path from "path";
import config from "../persistent/config.json";

const file_config = path.join(__dirname, "../persistent/config.json");

export const getSetting = (setting: keyof typeof config) => {
  return config[setting];
};

export const getBaseDir = () => {
  if (process.env.BASE_DIR) {
    return path.resolve(process.env.BASE_DIR);
  }
  const base_dir = path.resolve(__dirname, "../../", getSetting("BASE_DIR") as string);
  return base_dir;
};

/**
 * Inicio de carpeta base para archivos, excepciones continuan para modificar ajuste en cliente
 */
export async function init_basedir() {
  let baseDir = getBaseDir();
  try {
    await fs.access(baseDir);
  } catch (error) {
    await fs.mkdir(baseDir, { recursive: true });
  }
}

// cambiar el valor de una confiuguracion
export const setSetting = async <K extends keyof typeof config>(setting: K, value: (typeof config)[K]) => {
  //si es limit storage convertir GB a bytes
  if (setting === "LIMIT_STORAGE") {
    (config as any)[setting] = Number(value) * 1024 * 1024 * 1024;
  } else {
    (config as any)[setting] = value;
  }
  await fs.writeFile(file_config, JSON.stringify(config, null, 2));
};

let cachedUsedStorage: number | null = null;

/**
 * Obtiene el almacenamiento actual usado en bytes (desde memoria caché o config.json).
 */
export const getUsedStorage = async (): Promise<number> => {
  if (cachedUsedStorage !== null) {
    return cachedUsedStorage;
  }
  const saved = config.USED_STORAGE;
  if (typeof saved === "number") {
    cachedUsedStorage = saved;
    return cachedUsedStorage;
  }
  return 0;
};

/**
 * Actualiza el almacenamiento usado tanto en memoria caché como en el archivo config.json.
 */
export const updateUsedStorage = async (newSize: number) => {
  cachedUsedStorage = newSize;
  (config as any).USED_STORAGE = newSize;
  try {
    await fs.writeFile(file_config, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Error al escribir el archivo de configuración de almacenamiento:", err);
  }
};

/**
 * Suma bytes al almacenamiento actual usado.
 */
export const addUsedStorage = async (bytes: number) => {
  const current = await getUsedStorage();
  await updateUsedStorage(current + bytes);
};

/**
 * Resta bytes del almacenamiento actual usado.
 */
export const subtractUsedStorage = async (bytes: number) => {
  const current = await getUsedStorage();
  await updateUsedStorage(Math.max(0, current - bytes));
};
