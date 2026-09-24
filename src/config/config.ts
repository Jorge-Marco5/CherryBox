import { Setting } from "../utils/settings";
import { ValidationError } from "../utils/errors";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Si no existe archivo .env pero las variables requeridas existen en el entorno (ej. en Docker), continuar
if (!fs.existsSync('.env') && !process.env.DATABASE_URL) {
    throw new ValidationError("No se encontró alguna configuracion de entorno");
}

export const system_setting = new Setting();

interface config_server {
    DATABASE_URL: string;
    NODE_ENV: "development" | "production";
    REVERSE_PROXY: boolean;
    FRONTEND_URL: string;
    PORT: string | number;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string,
    API_BASE_PATH: string;
    BASE_DIR: string;
}

export const config: config_server = {
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:postgres_password@localhost:5432/cherrybox_db?schema=public",
    NODE_ENV: process.env.NODE_ENV as "development" | "production" || "development",
    REVERSE_PROXY: process.env.REVERSE_PROXY?.toLowerCase() === 'true' || false,
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET || "secret",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    API_BASE_PATH: process.env.API_BASE_PATH || "/api",
    BASE_DIR: process.env.BASE_DIR || "files"
}
