import { Setting } from "../utils/settings";
import dotenv from "dotenv";
dotenv.config();

export const system_setting = new Setting();

interface config_server {
    NODE_ENV: "development" | "production";
    REVERSE_PROXY: boolean;
    FRONTEND_URL: string;
    PORT: string | number;
    DATABASE_URL: string;
    API_BASE_PATH: string;
    BASE_DIR: string;
    MAX_FILE_SIZE: number;
    MAX_FILES: number;
    LIMIT_STORAGE: number;
    USED_STORAGE: number;
    JWT_SECRET: string;
}

export const config: config_server = {
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/cherrybox",
    NODE_ENV: process.env.NODE_ENV as "development" | "production" || "development",
    REVERSE_PROXY: process.env.REVERSE_PROXY?.toLowerCase() === 'true' || false,
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET || "secret",
    API_BASE_PATH: process.env.API_BASE_PATH || "/api",
    BASE_DIR: process.env.BASE_DIR || "files",
    MAX_FILE_SIZE: Number(process.env.MAX_FILE_SIZE) || 524288000,
    MAX_FILES: Number(process.env.MAX_FILES) || 10,
    LIMIT_STORAGE: Number(process.env.LIMIT_STORAGE) || 10737418240,
    USED_STORAGE: Number(process.env.USED_STORAGE) || 0,
}
