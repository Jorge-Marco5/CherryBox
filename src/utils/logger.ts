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
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        logFormat
      )
    }),
    new transports.File({ filename: path.join(LOGS_DIR, 'error.log'), level: 'error' }),
    new transports.File({ filename: path.join(LOGS_DIR, 'combined.log') }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(LOGS_DIR, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(LOGS_DIR, 'rejections.log') })
  ]
});
