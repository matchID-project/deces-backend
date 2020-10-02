import { createLogger, format, transports, Logger } from 'winston';
const { printf } = format

const level = process.env.BACKEND_LOG_LEVEL ? process.env.BACKEND_LOG_LEVEL : process.env.NODE_ENV === 'production' ? 'info' : 'debug'

const options = {
  console: {
    level,
    json: false,
    colorize: true,
  },
}
const simplestFormat = printf(({ message }: any) => message)

const simplestLogger: Logger = createLogger({
  format: simplestFormat,
  transports: [new transports.Console(options.console)],
  exitOnError: false,
})

class LoggerStream {
  write(message: string) {
    simplestLogger.info(message.substring(0, message.lastIndexOf('\n')));
  }
}

export = new LoggerStream();
