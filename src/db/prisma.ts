import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Graceful connection verification
export async function testDatabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isDatabaseConfigured) {
    return {
      ok: false,
      message: 'DATABASE_URL não configurada no .env. Configure sua URL do Supabase.',
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      message: 'Conexão com PostgreSQL / Supabase estabelecida com sucesso!',
    };
  } catch (error: any) {
    return {
      ok: false,
      message: `Falha ao conectar no Supabase: ${error?.message || error}`,
    };
  }
}
