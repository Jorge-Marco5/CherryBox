//npx tsx ./src/config/sftp-connection.ts
import Client from "ssh2-sftp-client";
import 'dotenv/config';
import { readFileSync } from 'fs';
import { getSetting } from "../utils/settings";
const sftp = new Client();

const sftp_base_dir = getSetting('SFTP_BASE_DIR')?.toString() || '/';

async function testConnection() {
    try {
        const connectionWithKey = process.env.SFTP_KEYCONN === 'true';
        const config = {
            host: process.env.SFTP_HOST,
            port: Number(process.env.SFTP_PORT),
            username: process.env.SFTP_USERNAME,
            password: process.env.SFTP_PASSWORD,
            privateKey: '',
        };
        if (connectionWithKey) {
            const privateKey = readFileSync(process.env.SFTP_PRIVATE_KEY_PATH as string);
            config.privateKey = privateKey.toString('utf-8');
        } else {
            config.password = process.env.SFTP_PASSWORD;
        }
        await sftp.connect(config);
        console.log('Conexión SFTP exitosa');
        const path = sftp_base_dir.toString();
        const currentPath = path;

        //carga de un archivo
        //await uploadFile('./package.json', currentPath + '/package.json');

        //creacion de un directorio
        //await createDirectory(currentPath + '/test2');

        //lista de archivos
        const files = await listFiles(currentPath);
        sftp.end();
        console.log({ files: files, currentPath: currentPath, base_dir: sftp_base_dir });
        return { files: files, currentPath: currentPath };
    } catch (error) {
        console.error('Error al conectar a SFTP:', error);
        throw error;
    }
}

/**
 * Lista los archivos de un directorio
 * @param remotePath Ruta del directorio
 * @returns Array de archivos
 */
async function listFiles(remotePath: string) {
    try {
        const files = await sftp.list(remotePath);
        return files;
    } catch (error) {
        console.error('Error al listar archivos en SFTP:', error);
    }
}

/**
 * Verifica si una ruta existe en el servidor SFTP
 * @param remotePath Ruta del archivo o directorio
 * @returns true si la ruta existe, false si no existe
 */
async function existsPath(remotePath: string) {
    try {
        const exists = await sftp.exists(remotePath);
        if (exists) {
            console.log('La ruta existe');
        } else {
            console.log('La ruta no existe');
        }
        return exists;
    } catch (error) {
        console.error('Error al verificar la ruta:', error);
        return null;
    }
}

/**
 * Sube un archivo a la ruta especificada
 * @param localPath Ruta del archivo local
 * @param remotePath Ruta del archivo remoto
 * @returns {Promise<boolean>} true si se subio el archivo, false si no
 */
async function uploadFile(localPath: string, remotePath: string) {
    try {
        await sftp.put(readFileSync(localPath), remotePath);
        return true;
    } catch (error) {
        console.error('Error al subir el archivo:', error);
        return false;
    }
}

/**
 * Crea un directorio en la ruta especificada
 * @param remotePath Ruta del directorio a crear
 * @returns {Promise<boolean>} true si se creo el directorio, false si no
 */
async function createDirectory(remotePath: string) {
    try {
        await sftp.mkdir(remotePath);
        return true;
    } catch (error) {
        console.error('Error al crear el directorio:', error);
        return false;
    }
}

/**
 * Elimina un directorio en la ruta especificada
 * @param remotePath Ruta del directorio a eliminar
 * @returns {Promise<boolean>} true si se elimino el directorio, false si no
 */
async function removeDirectory(remotePath: string) {
    try {
        await sftp.rmdir(remotePath);
        return true;
    } catch (error) {
        console.error('Error al eliminar el directorio:', error);
        return false;
    }
}

/**
 * Elimina un archivo en la ruta especificada
 * @param filePath Ruta del archivo a eliminar
 * @returns {Promise<boolean>} true si se elimino el archivo, false si no
 */
async function removeFile(filePath: string) {
    try {
        await sftp.delete(filePath);
        return true;
    } catch (error) {
        console.error('Error al eliminar el archivo:', error);
        return false;
    }
}




testConnection();