/* eslint linebreak-style: ["error", "windows"] */
const { createLogger, format, transports } = require('winston');


const {
  combine, timestamp, prettyPrint, colorize,
} = format;

const myFormat = format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`);

const riscoLogger = createLogger({
  level: 'info',
  format: combine(
    // json(),
    colorize(),
    timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
    prettyPrint(),
    myFormat,
  ),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//

if (process.env.NODE_ENV !== 'production') {
  riscoLogger.add(new transports.Console({
    // format: format.simple(),
    format: myFormat,
    level: 'debug',
  }));
}

module.exports = riscoLogger;
