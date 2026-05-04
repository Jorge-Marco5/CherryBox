//npx tsx ./src/config/sftp-connection.ts
import Client from "ssh2-sftp-client";
import 'dotenv/config';
import { readFileSync } from 'fs';
import { getSetting } from "../utils/settings";
const sftp = new Client();
import SftpService from '../services/sftp/sftp.service';

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
        //await SftpService.uploadFile('./package.json', currentPath + '/package.json');

        //creacion de un directorio
        //await SftpService.createDirectory(currentPath + '/test2');

        //lista de archivos
        const files = await SftpService.listFiles(currentPath);
        sftp.end();
        console.log({ files: files, currentPath: currentPath, base_dir: sftp_base_dir });
        return { files: files, currentPath: currentPath };
    } catch (error) {
        console.error('Error al conectar a SFTP:', error);
        throw error;
    }
}

testConnection();