import { createLogger, format, transports } from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = format;

// Directorio de logs dentro de src
const LOGS_DIR = path.join(__dirname, '../logs');

// Formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp, stack }: any) => {
  return `${timestamp} ${level} - ${stack || message}`;
});

// Configuración del logger
export const logger = createLogger({
  level: 'info', // Nivel mínimo de log
  format: combine(
    colorize(), // Colores en consola
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Captura stack trace en errores
    logFormat
  ),
  transports: [
    new transports.Console(), // Salida en consola
    new transports.File({ filename: path.join(LOGS_DIR, 'error.log'), level: 'error' }), // Solo errores
    new transports.File({ filename: path.join(LOGS_DIR, 'combined.log') }) // Todos los niveles
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(LOGS_DIR, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(LOGS_DIR, 'rejections.log') })
  ]
});
