/**
 * Structured Logger (Pino)
 *
 * JSON output in production, pretty-print in development.
 * Log level configurable via LOG_LEVEL env var (default: 'info').
 *
 * Usage:
 *   const logger = require('./lib/logger');
 *   logger.info({ task_id: '...' }, 'Task created');
 *   logger.error({ err, req_id: req.id }, 'Payment failed');
 *
 * Child loggers for subsystems:
 *   const log = logger.child({ service: 'stripe' });
 *   log.info('Webhook received');
 */

const pino = require('pino');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const logger = pino({
  level: LOG_LEVEL,
  base: {
    service: 'irlwork-api',
    env: process.env.NODE_ENV || 'development',
  },
  // In development, use pino-pretty for readable output
  // In production, use standard JSON for log aggregation
  ...(IS_PRODUCTION
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname,service,env',
          },
        },
      }),
});

module.exports = logger;
