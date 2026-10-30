import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registrationRoutes } from './routes/registrations';
import { testDatabaseConnection, isDatabaseConfigured } from './db/prisma';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

export async function buildFastifyApp() {
  // CORS setup
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Health check route
  server.get('/api/health', async (_req, reply) => {
    const dbStatus = await testDatabaseConnection();
    return reply.send({
      status: 'ok',
      service: '72º Encontro de Casais INVA — Backend Fastify',
      timestamp: new Date().toISOString(),
      database: {
        configured: isDatabaseConfigured,
        ...dbStatus,
      },
    });
  });

  // Register API routes
  await server.register(registrationRoutes, { prefix: '/api' });

  return server;
}

// Start standalone server when executed directly
async function start() {
  try {
    const app = await buildFastifyApp();
    const port = Number(process.env.PORT) || 3333;
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.log(`[Fastify] Servidor rodando em http://${host}:${port}`);
    console.log(`[Fastify] Health check disponível em http://${host}:${port}/api/health`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITE_EMBEDDED) {
  start();
}

export default server;
