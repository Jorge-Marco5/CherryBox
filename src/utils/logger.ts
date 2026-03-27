// logger.js
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

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
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // Solo errores
    new transports.File({ filename: 'logs/combined.log' }) // Todos los niveles
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' })
  ]
});
