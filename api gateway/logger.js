const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    // Extracción de stacktrace
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const logger = winston.createLogger({
    transports: [
        // Nivel INFO: Se pinta en consola
        new winston.transports.Console({
            level: 'info',
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // Nivel ERROR: Se guarda en archivo diario en local
        new DailyRotateFile({
            level: 'error',
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            format: customFormat
        })
    ]
});

module.exports = logger;