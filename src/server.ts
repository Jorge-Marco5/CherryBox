import dotenv from "dotenv"
dotenv.config();

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';
import indexRouter from './routes/index';
import filesRouter from './routes/files.routes';
import usersRouter from './routes/users.routes';
import { getBaseDir } from './utils/settings';
import settingsRouter from './routes/settings.routes';
import cookieParser from "cookie-parser"
import authRouter from './routes/auth.routes';
import permissionsRouter from './routes/permissions.routes';
import { errorHandler } from "./middlewares/error.middleware";

const app = express();
const PORT = process.env.PORT || 7005;

app.use(cookieParser())

// Configura esta ruta a la carpeta que deseas administrar
const BASE_DIR = getBaseDir();

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
    fs.mkdir(BASE_DIR, { recursive: true })
]).then(() => {
    // Rutas
    app.use('/', indexRouter);
    app.use('/api', filesRouter);
    app.use('/api', settingsRouter);
    app.use('/api', usersRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/permissions', permissionsRouter);

    // Middleware de manejo de errores global (Debe ir después de las rutas)
    app.use(errorHandler);

    app.listen(PORT, () => {
        console.log(`🍒 CherryBox page en: http://localhost:${PORT}/`);
    });
});