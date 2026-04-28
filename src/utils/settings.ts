import fs from 'fs/promises';
import path from 'path';
import config from '../persistent/config.json';

const file_config = path.join(__dirname, '../persistent/config.json');

export const getSetting = (setting: keyof typeof config) => {
    return config[setting];
}

export const getBaseDir = () => {
    return path.resolve(__dirname, '../../', getSetting('BASE_DIR') as string);
}

// cambiar el valor de una confiuguracion
export const setSetting = async <K extends keyof typeof config>(setting: K, value: (typeof config)[K]) => {
    //si es limit storage convertir GB a bytes
    if (setting === 'LIMIT_STORAGE') {
        (config as any)[setting] = Number(value) * 1024 * 1024 * 1024;
    } else {
        (config as any)[setting] = value;
    }
    await fs.writeFile(file_config, JSON.stringify(config, null, 2));
}