import fs from "fs/promises";
import path from "path";

const file_config = path.join(__dirname, "../persistent/config.json");

export const config_default = {
  BASE_DIR: "archivos",
  MAX_FILE_SIZE: 524288000,
  MAX_FILES: "10",
  LIMIT_STORAGE: 10737418240,
  USED_STORAGE: 0
}

let config = {
  BASE_DIR: "archivos",
  MAX_FILE_SIZE: 524288000,
  MAX_FILES: "10",
  LIMIT_STORAGE: 10737418240,
  USED_STORAGE: 0
}

export class Setting {
  private config: typeof config_default;
  private cachedUsedStorage: number | null = null;
  constructor() {
    this.config = config;
    this.cachedUsedStorage = config.USED_STORAGE;
  }

  getSetting = (setting: keyof typeof config_default) => {
    return this.config[setting];
  };

  getBaseDir = () => {
    if (process.env.BASE_DIR) {
      return path.resolve(process.env.BASE_DIR);
    }
    const base_dir = path.resolve(__dirname, "../../", this.getSetting("BASE_DIR") as string);
    return base_dir;
  };

  init_basedir = async () => {
    let baseDir = this.getBaseDir();
    try {
      await fs.access(baseDir);
      await fs.access(file_config);
    } catch (error) {
      if (error instanceof Error) {
        await fs.mkdir(baseDir, { recursive: true });
        console.log("Se a creado la carpeta base", baseDir);
        await fs.writeFile(file_config, JSON.stringify(config_default, null, 2));
        console.log("Se a creado el archivo config.json", file_config);
      }
    }
  }

  // cambiar el valor de una confiuguracion
  setSetting = async <K extends keyof typeof config_default>(setting: K, value: (typeof config_default)[K]) => {
    //si es limit storage convertir GB a bytes
    if (setting === "LIMIT_STORAGE") {
      (this.config as any)[setting] = Number(value) * 1024 * 1024 * 1024;//en GB a bytes
    } else if (setting === "MAX_FILE_SIZE") {
      (this.config as any)[setting] = Number(value) * 1024 * 1024;//en MB a bytes
    } else {
      (this.config as any)[setting] = value;
    }
    await fs.writeFile(file_config, JSON.stringify(this.config, null, 2));
  };

  /**
   * Obtiene el almacenamiento actual usado en bytes (desde memoria caché o config.json).
   */
  getUsedStorage = async (): Promise<number> => {
    if (this.cachedUsedStorage !== null) {
      return this.cachedUsedStorage;
    }
    const saved = this.config.USED_STORAGE;
    if (typeof saved === "number") {
      this.cachedUsedStorage = saved;
      return this.cachedUsedStorage;
    }
    return 0;
  };

  /**
   * Actualiza el almacenamiento usado tanto en memoria caché como en el archivo config.json.
   */
  updateUsedStorage = async (newSize: number) => {
    this.cachedUsedStorage = newSize;
    (this.config as any).USED_STORAGE = newSize;
    try {
      await fs.writeFile(file_config, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error("Error al escribir el archivo de configuración de almacenamiento:", err);
    }
  };

  /**
   * Suma bytes al almacenamiento actual usado.
   */
  addUsedStorage = async (bytes: number) => {
    const current = await this.getUsedStorage();
    await this.updateUsedStorage(current + bytes);
  };

  /**
   * Resta bytes del almacenamiento actual usado.
   */
  subtractUsedStorage = async (bytes: number) => {
    const current = await this.getUsedStorage();
    await this.updateUsedStorage(Math.max(0, current - bytes));
  };

}