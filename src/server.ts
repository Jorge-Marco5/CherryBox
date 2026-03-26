import dotenv from "dotenv"
dotenv.config();

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';
import { logger } from './utils/logger';
import indexRouter from './routes/index';
import filesRouter from './routes/files.routes';
import { getSetting, getBaseDir } from './utils/settings';
import settingsRouter from './routes/settings.routes';
import multer from 'multer';
import cookieParser from "cookie-parser"
import authRouter from './routes/auth.routes';

const app = express();
const PORT = process.env.PORT || 7005;

app.use(cookieParser())

// Configura esta ruta a la carpeta que deseas administrar
const BASE_DIR = getBaseDir();
const STORAGE_DIR = path.join(__dirname, '../storage');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/public', express.static(path.join(__dirname, '../public')));

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));
app.use(express.json());

// Inicialización del servidor y carpetas
Promise.all([
    fs.mkdir(BASE_DIR, { recursive: true }),
    fs.mkdir(STORAGE_DIR, { recursive: true })
]).then(() => {
    // Middleware de manejo de errores global
    app.use((err: any, req: any, res: any, next: any) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'El archivo es demasiado grande' });
            }
            return res.status(500).json({ error: err.message });
        }

        // Errores JSON mal formados
        if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
            return res.status(400).json({ error: 'Bad Request: Malformed JSON' });
        }

        logger.error('Error no manejado:', err);
        res.status(500).json({ error: err.message || 'Error interno del servidor' });
    });

    // Rutas
    app.use('/', indexRouter);
    app.use('/api', filesRouter);
    app.use('/api', settingsRouter);
    app.use('/api/auth', authRouter);

    app.listen(PORT, () => {
        console.log(`🍒 CherryBox page en: http://localhost:${PORT}/`);
    });
});