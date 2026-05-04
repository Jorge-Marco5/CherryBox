import 'dotenv/config';
import Client from "ssh2-sftp-client";
import { readFileSync } from 'fs';
import { getSetting } from '../../utils/settings';
const sftp = new Client();

export default class SftpService {

    private static sftp_base_dir = getSetting('SFTP_BASE_DIR')?.toString() || '/';

    /**
     * Construye la ruta remota completa
     * @param relativePath Ruta relativa
     * @returns Ruta completa
     */
    private static buildRemotePath(relativePath: string): string {
        return `${this.sftp_base_dir}/${relativePath}`;
    }

    /**
     * Lista los archivos de un directorio
     * @param relativePath Ruta del directorio
     * @returns Array de archivos
     */
    static async listFiles(relativePath: string) {
        try {
            const remotePath = this.buildRemotePath(relativePath);
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
    static async existsPath(relativePath: string) {
        try {
            const remotePath = this.buildRemotePath(relativePath);
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
    static async uploadFile(localPath: string, remotePath: string) {
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
    static async createDirectory(remotePath: string) {
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
    static async removeDirectory(remotePath: string) {
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
    static async removeFile(filePath: string) {
        try {
            await sftp.delete(filePath);
            return true;
        } catch (error) {
            console.error('Error al eliminar el archivo:', error);
            return false;
        }
    }

    /**
     * Descarga de un archivo especifico
     * @param remotePath Ruta del archivo remoto
     * @param localPath Ruta del archivo local
     * @returns {Promise<boolean>} true si se descargo el archivo, false si no
     */
    static async downloadFile(remotePath: string, localPath: string) {
        try {
            await sftp.downloadDir(remotePath, localPath);
            return true;
        } catch (error) {
            console.error('Error al descargar el archivo:', error);
            return false;
        }
    }
}