import app from './app';
import config from './app/config';
import prisma from './app/utils/prisma';

const server = app.listen(config.port);

server.on('listening', () => {
  console.log(`Server is running on port ${config.port}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(`Failed to start server on port ${config.port}:`, error.message);
  process.exit(1);
});

const shutdown = async (signal: string): Promise<void> => {
  console.log(`${signal} received. Shutting down gracefully.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  void shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  void shutdown('uncaughtException');
});
