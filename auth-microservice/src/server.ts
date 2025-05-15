import logger from './config/logger';
import { App } from './app';
import { getConfig } from './config/config';

async function bootstrap() {
  try {
    const app = new App();
    const port = Number(getConfig().PORT);
    await app.start(port);
  } catch (error) {
    logger.error('Error starting server', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
  process.exit(1);
});

bootstrap();