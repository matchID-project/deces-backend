import { createLogger, format, transports } from 'winston';
const { printf } = format

const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

const options = {
  console: {
    level,
    json: false,
    colorize: true,
  },
}
const simplestFormat = printf(({ message }: any) => message)

export const simplestLogger = createLogger({
  format: simplestFormat,
  transports: [new transports.Console(options.console)],
  exitOnError: false,
})

export const loggerStream = {
  write (message: any, encoding: any) {
    simplestLogger.info(message.trim())
  },
} as any
