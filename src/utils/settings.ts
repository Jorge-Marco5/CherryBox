import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

/**
 * Interfaz que define la estructura del archivo de configuración del sistema.
 */
export interface AppConfig {
  BASE_DIR: string;
  MAX_FILE_SIZE: number;  // Tamaño máximo por archivo en bytes (ej: 524288000 = 500 MB)
  MAX_FILES: string;      // Cantidad máxima de archivos por subida (ej: "10")
  LIMIT_STORAGE: number;  // Capacidad de almacenamiento total en bytes (ej: 10737418240 = 10 GB)
  USED_STORAGE: number;   // Almacenamiento actualmente utilizado en bytes
}

/**
 * Configuración por defecto utilizada en caso de que config.json no exista.
 */
export const config_default: AppConfig = {
  BASE_DIR: "files", //carpeta por defecto para almacenar archivos dentro del proyecto
  MAX_FILE_SIZE: 524288000,    // 500 MB
  MAX_FILES: "10",
  LIMIT_STORAGE: 10737418240,   // 10 GB
  USED_STORAGE: 0,
};

// Ubicación del directorio y archivo de configuración persistente
const configDir = path.resolve(__dirname, "../persistent");
const file_config = path.join(configDir, "config.json");

/**
 * Función auxiliar para leer o inicializar el archivo config.json de forma síncrona
 * al instanciar el módulo.
 */
function loadInitialConfig(): AppConfig {
  try {
    if (fsSync.existsSync(file_config)) {
      const raw = fsSync.readFileSync(file_config, "utf-8");
      const parsed = JSON.parse(raw);
      // Combinar con config_default para garantizar que todas las claves requeridas existan
      return { ...config_default, ...parsed };
    }
  } catch (error) {
    console.warn("⚠️ Aviso al leer config.json existente, se creará uno nuevo:", error);
  }

  // Si no existe o hubo error de lectura, asegurar carpeta y crear el archivo
  try {
    if (!fsSync.existsSync(configDir)) {
      fsSync.mkdirSync(configDir, { recursive: true });
    }
    fsSync.writeFileSync(file_config, JSON.stringify(config_default, null, 2), "utf-8");
    console.log("⚙️ Archivo config.json generado con valores por defecto:", file_config);
  } catch (err) {
    console.error("❌ Error al crear el archivo config.json inicial:", err);
  }

  return { ...config_default };
}

/**
 * Clase encargada de administrar, consultar y actualizar la configuración global del sistema
 * con persistencia en el archivo config.json.
 */
export class Setting {
  private config: AppConfig;
  private cachedUsedStorage: number | null = null;
  private readonly configPath: string = file_config;
  private readonly configDirPath: string = configDir;

  constructor() {
    this.config = loadInitialConfig();
    this.cachedUsedStorage = this.config.USED_STORAGE;
  }

  /**
   * Obtiene la ruta física del archivo config.json
   */
  getConfigPath = (): string => {
    return this.configPath;
  };

  /**
   * Obtiene el valor de una configuración individual.
   * @param setting Clave de la configuración a consultar.
   */
  getSetting = <K extends keyof AppConfig>(setting: K): AppConfig[K] => {
    return this.config[setting];
  };

  /**
   * Obtiene una copia completa de la configuración en memoria.
   */
  getAllSettings = (): AppConfig => {
    return { ...this.config };
  };

  /**
   * Obtiene la ruta absoluta de la carpeta base donde se almacenan los archivos.
   * Prioriza la variable de entorno BASE_DIR si está presente.
   */
  getBaseDir = (): string => {
    if (process.env.BASE_DIR) {
      return path.resolve(process.env.BASE_DIR);
    }
    const relativeBase = this.config.BASE_DIR || config_default.BASE_DIR;
    return path.resolve(__dirname, "../../", relativeBase);
  };

  /**
   * Asegura la creación e integridad de la carpeta base de archivos y del archivo config.json.
   */
  init_basedir = async (): Promise<void> => {
    const baseDir = this.getBaseDir();
    try {
      await fs.mkdir(baseDir, { recursive: true });
      await fs.mkdir(this.configDirPath, { recursive: true });

      try {
        await fs.access(this.configPath);
        // Sincronizar memoria con el contenido actual en disco
        await this.reloadConfig();
      } catch {
        // Si el archivo no existe, crearlo con los valores por defecto
        await fs.writeFile(this.configPath, JSON.stringify(config_default, null, 2), "utf-8");
        this.config = { ...config_default };
        this.cachedUsedStorage = config_default.USED_STORAGE;
        console.log("⚙️ Archivo config.json creado correctamente en:", this.configPath);
      }
    } catch (error) {
      console.error("❌ Error al inicializar directorios y configuración base:", error);
    }
  };

  /**
   * Modifica una configuración y persiste el cambio inmediatamente en config.json.
   * 
   * @param setting Clave de la configuración a modificar.
   * @param value Nuevo valor asignado (validado y normalizado).
   */
  setSetting = async <K extends keyof AppConfig>(
    setting: K,
    value: AppConfig[K] | any
  ): Promise<void> => {
    (this.config as any)[setting] = value;
    if (setting === "USED_STORAGE") {
      this.cachedUsedStorage = Number(value);
    }
    await this.saveConfig();
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
   * Actualiza el almacenamiento usado tanto en memoria como en el archivo config.json.
   * @param newSize Nuevo tamaño ocupado en bytes.
   */
  updateUsedStorage = async (newSize: number): Promise<void> => {
    this.cachedUsedStorage = newSize;
    this.config.USED_STORAGE = newSize;
    try {
      await this.saveConfig();
    } catch (err) {
      console.error("❌ Error al persistir el tamaño de almacenamiento usado:", err);
    }
  };

  /**
   * Suma bytes al almacenamiento actual usado y actualiza config.json.
   * @param bytes Cantidad de bytes a añadir.
   */
  addUsedStorage = async (bytes: number): Promise<void> => {
    const current = await this.getUsedStorage();
    await this.updateUsedStorage(current + bytes);
  };

  /**
   * Resta bytes del almacenamiento actual usado y actualiza config.json.
   * @param bytes Cantidad de bytes a restar.
   */
  subtractUsedStorage = async (bytes: number): Promise<void> => {
    const current = await this.getUsedStorage();
    await this.updateUsedStorage(Math.max(0, current - bytes));
  };

  /**
   * Vuelve a cargar el archivo config.json desde disco y actualiza la memoria.
   */
  reloadConfig = async (): Promise<AppConfig> => {
    try {
      const raw = await fs.readFile(this.configPath, "utf-8");
      const parsed = JSON.parse(raw);
      this.config = { ...config_default, ...parsed };
      this.cachedUsedStorage = this.config.USED_STORAGE;
    } catch (err) {
      console.error("❌ Error al recargar config.json desde disco:", err);
    }
    return { ...this.config };
  };

  /**
   * Restablece la configuración completa a los valores por defecto y los persiste.
   */
  resetToDefault = async (): Promise<void> => {
    this.config = { ...config_default };
    this.cachedUsedStorage = config_default.USED_STORAGE;
    await this.saveConfig();
    console.log("⚙️ Configuración restablecida a los valores por defecto.");
  };

  /**
   * Método privado para escribir el estado actual de la configuración en disco.
   */
  private async saveConfig(): Promise<void> {
    await fs.mkdir(this.configDirPath, { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
  }
}