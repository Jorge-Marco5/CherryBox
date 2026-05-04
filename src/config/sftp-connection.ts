import Client from "ssh2-sftp-client";
import 'dotenv/config';
import { readFileSync } from 'fs';
import { getSetting } from "../utils/settings";
const sftp = new Client();

const sftp_base_dir = getSetting('SFTP_BASE_DIR') || '';

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
        await listFiles(sftp_base_dir.toString());
        sftp.end();
        return sftp;
    } catch (error) {
        console.error('Error al conectar a SFTP:', error);
        throw error;
    }
}

async function listFiles(remotePath: string) {
    try {
        const files = await sftp.list(remotePath);
        console.log('Archivos en el servidor SFTP:', files);
    } catch (error) {
        console.error('Error al listar archivos en SFTP:', error);
    }
}

testConnection();