import fs from "fs/promises";
import path from "path";
import { AppConfig, Setting } from "../utils/settings";
import { system_setting } from "../config/config";
import { ValidationError } from "../utils/errors";
import { calculateDirSize } from "../controllers/settings.controller";

/**
 * Contexto proporcionado a cada estrategia durante su ejecución.
 */
export interface SettingContext {
  settingInstance: Setting;
  currentConfig: AppConfig;
}

/**
 * Interfaz base para el patrón Strategy en la gestión de configuraciones.
 */
export interface SettingStrategy<K extends keyof AppConfig = keyof AppConfig> {
  /**
   * Valida las reglas de negocio específicas para este tipo de configuración.
   * Lanza un ValidationError si la validación falla.
   */
  validate(value: any, context: SettingContext): Promise<void> | void;

  /**
   * Transforma y normaliza el valor de entrada al formato que se guardará en config.json.
   */
  transform(value: any): AppConfig[K];

  /**
   * Acciones o efectos secundarios a ejecutar después de persistir el cambio en disco.
   */
  afterChange?(value: AppConfig[K], context: SettingContext): Promise<void> | void;
}

/**
 * Estrategia para LIMIT_STORAGE:
 * - Valida número mayor a 0 y que el nuevo límite no sea menor al almacenamiento ya ocupado.
 * - Convierte de Gigabytes (GB) a bytes si se recibe en formato de unidad amigable.
 */
export class LimitStorageStrategy implements SettingStrategy<"LIMIT_STORAGE"> {
  async validate(value: any, { settingInstance }: SettingContext): Promise<void> {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      throw new ValidationError("El límite de almacenamiento debe ser un número mayor a 0");
    }

    const usedBytes = await settingInstance.getUsedStorage();
    const targetBytes = this.transform(value);

    if (targetBytes < usedBytes) {
      throw new ValidationError(
        "El límite de almacenamiento debe ser mayor o igual al tamaño actual de los archivos almacenados"
      );
    }
  }

  transform(value: any): number {
    const num = Number(value);
    // Si el valor recibido parece venir en GB (ej: 10 en lugar de 10737418240), convertir a bytes
    return num < 1024 * 1024 ? num * 1024 * 1024 * 1024 : num;
  }
}

/**
 * Estrategia para MAX_FILE_SIZE:
 * - Valida que sea un número mayor a 0.
 * - Convierte de Megabytes (MB) a bytes si se recibe en formato de unidad amigable.
 */
export class MaxFileSizeStrategy implements SettingStrategy<"MAX_FILE_SIZE"> {
  validate(value: any): void {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      throw new ValidationError("El tamaño máximo de archivo debe ser un número mayor a 0");
    }
  }

  transform(value: any): number {
    const num = Number(value);
    // Si el valor recibido parece venir en MB (ej: 500 en lugar de 524288000), convertir a bytes
    return num < 1024 * 1024 ? num * 1024 * 1024 : num;
  }
}

/**
 * Estrategia para MAX_FILES:
 * - Valida que sea un número entero mayor a 0.
 * - Lo transforma a string para mantener consistencia con la interfaz.
 */
export class MaxFilesStrategy implements SettingStrategy<"MAX_FILES"> {
  validate(value: any): void {
    const num = Number(value);
    if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      throw new ValidationError("La cantidad máxima de archivos debe ser un número entero mayor a 0");
    }
  }

  transform(value: any): string {
    return String(Math.floor(Number(value)));
  }
}

/**
 * Estrategia para BASE_DIR:
 * - Valida que no esté vacío.
 * - Efecto secundario (afterChange): asegura la creación de la nueva carpeta en el disco.
 */
export class BaseDirStrategy implements SettingStrategy<"BASE_DIR"> {
  validate(value: any): void {
    if (typeof value !== "string" || !value.trim()) {
      throw new ValidationError("El directorio base debe ser una ruta válida no vacía");
    }
  }

  transform(value: any): string {
    return String(value).trim();
  }

  async afterChange(value: string, { settingInstance }: SettingContext): Promise<void> {
    const targetPath = path.isAbsolute(value)
      ? value
      : path.resolve(__dirname, "../../", value);
    await fs.mkdir(targetPath, { recursive: true });

    const baseDir = system_setting.getBaseDir();
    const currentSize = await calculateDirSize(baseDir);
    await system_setting.updateUsedStorage(currentSize);
  }
}

/**
 * Estrategia para USED_STORAGE:
 * - Valida que sea un número no negativo.
 * - Actualiza la memoria caché en Setting.
 */
export class UsedStorageStrategy implements SettingStrategy<"USED_STORAGE"> {
  validate(value: any): void {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      throw new ValidationError("El tamaño de almacenamiento usado debe ser un número mayor o igual a 0");
    }
  }

  transform(value: any): number {
    return Number(value);
  }
}

/**
 * Estrategia por defecto para propiedades generales no mapeadas explícitamente.
 */
export class DefaultSettingStrategy implements SettingStrategy {
  validate(): void { }
  transform(value: any): any {
    return value;
  }
}

/**
 * Servicio contextual que orquesta las estrategias según el tipo de configuración a modificar.
 */
export class SettingService {
  private strategies: Map<keyof AppConfig | string, SettingStrategy<any>> = new Map();

  constructor(private settingInstance: Setting) {
    this.registerStrategy("LIMIT_STORAGE", new LimitStorageStrategy());
    this.registerStrategy("MAX_FILE_SIZE", new MaxFileSizeStrategy());
    this.registerStrategy("MAX_FILES", new MaxFilesStrategy());
    this.registerStrategy("BASE_DIR", new BaseDirStrategy());
    this.registerStrategy("USED_STORAGE", new UsedStorageStrategy());
  }

  /**
   * Permite registrar o sobrescribir una estrategia para una clave determinada.
   */
  registerStrategy<K extends keyof AppConfig>(key: K, strategy: SettingStrategy<K>): void {
    this.strategies.set(key, strategy);
  }

  /**
   * Obtiene la estrategia correspondiente para una clave.
   */
  getStrategy<K extends keyof AppConfig>(key: K): SettingStrategy<K> {
    const strategy = this.strategies.get(key);
    return (strategy as SettingStrategy<K>) || new DefaultSettingStrategy();
  }

  /**
   * Ejecuta el flujo completo de la estrategia:
   * 1. Validación de reglas de negocio
   * 2. Transformación y normalización
   * 3. Persistencia en disco (config.json)
   * 4. Efectos secundarios (afterChange)
   */
  async updateSetting<K extends keyof AppConfig>(
    key: K,
    rawValue: any
  ): Promise<AppConfig[K]> {
    const strategy = this.getStrategy(key);
    const context: SettingContext = {
      settingInstance: this.settingInstance,
      currentConfig: this.settingInstance.getAllSettings(),
    };

    // 1. Validar
    await strategy.validate(rawValue, context);

    // 2. Transformar
    const finalValue = strategy.transform(rawValue);

    // 3. Persistir en Setting
    await this.settingInstance.setSetting(key, finalValue);

    // 4. Efectos colaterales posteriores
    if (strategy.afterChange) {
      await strategy.afterChange(finalValue, context);
    }

    return finalValue;
  }
}

// Exportación singleton del servicio configurado con la instancia global
export const settingService = new SettingService(system_setting);
