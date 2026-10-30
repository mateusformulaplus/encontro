import { prisma, isDatabaseConfigured } from '../db/prisma';
import fs from 'fs';
import path from 'path';

export interface CreateInscriptionInput {
  maridoNome: string;
  maridoNascimento: string;
  maridoCelular: string;
  maridoEmail?: string;
  maridoRedeSocial?: string;
  maridoProfissao: string;
  maridoMembroIgreja?: boolean;
  maridoQualIgreja: string;
  maridoAfastado?: boolean;
  maridoDieta?: string;
  maridoPaiNome?: string;
  maridoMaeNome?: string;
  maridoPaisTelefones?: string;

  esposaNome: string;
  esposaNascimento: string;
  esposaCelular: string;
  esposaEmail?: string;
  esposaRedeSocial?: string;
  esposaProfissao: string;
  esposaMembroIgreja?: boolean;
  esposaQualIgreja: string;
  esposaAfastada?: boolean;
  esposaDieta?: string;
  esposaPaiNome?: string;
  esposaMaeNome?: string;
  esposaPaisTelefones?: string;

  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado?: string;

  estadoCivil?: 'CASADOS' | 'COMPANHEIROS' | 'SOLTEIROS' | 'DIVORCIADOS';
  dataCasamento: string;
  fazParteGvc?: boolean;
  liderGvcNome?: string;
  liderGvcTelefone?: string;

  temFilhos?: boolean;
  quantosFilhos?: string;
  filhosDescricao?: string[];

  visitaDiaSemana?: string;
  visitaHorario?: string;

  comoSoube: string;
  amigoNome?: string;
  amigoTelefone?: string;
}

// Local JSON fallback store when database is not yet connected to Supabase
const FALLBACK_FILE = path.resolve(process.cwd(), 'backend_registrations_cache.json');

function readFallbackStore(): any[] {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      return JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('Error reading fallback store:', e);
  }
  return [];
}

function writeFallbackStore(data: any[]) {
  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('Error writing fallback store:', e);
  }
}

export class RegistrationService {
  static generateVoucherCode(): string {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `INVA72-${randomDigits}`;
  }

  static async createInscription(input: CreateInscriptionInput) {
    const voucherCode = this.generateVoucherCode();

    if (isDatabaseConfigured) {
      try {
        const record = await prisma.inscription.create({
          data: {
            voucherCode,
            maridoNome: input.maridoNome.toUpperCase(),
            maridoNascimento: new Date(input.maridoNascimento),
            maridoCelular: input.maridoCelular,
            maridoEmail: input.maridoEmail,
            maridoRedeSocial: input.maridoRedeSocial,
            maridoProfissao: input.maridoProfissao.toUpperCase(),
            maridoMembroIgreja: input.maridoMembroIgreja ?? true,
            maridoQualIgreja: input.maridoQualIgreja.toUpperCase(),
            maridoAfastado: input.maridoAfastado ?? false,
            maridoDieta: input.maridoDieta?.toUpperCase(),
            maridoPaiNome: input.maridoPaiNome?.toUpperCase(),
            maridoMaeNome: input.maridoMaeNome?.toUpperCase(),
            maridoPaisTelefones: input.maridoPaisTelefones,

            esposaNome: input.esposaNome.toUpperCase(),
            esposaNascimento: new Date(input.esposaNascimento),
            esposaCelular: input.esposaCelular,
            esposaEmail: input.esposaEmail,
            esposaRedeSocial: input.esposaRedeSocial,
            esposaProfissao: input.esposaProfissao.toUpperCase(),
            esposaMembroIgreja: input.esposaMembroIgreja ?? true,
            esposaQualIgreja: input.esposaQualIgreja.toUpperCase(),
            esposaAfastada: input.esposaAfastada ?? false,
            esposaDieta: input.esposaDieta?.toUpperCase(),
            esposaPaiNome: input.esposaPaiNome?.toUpperCase(),
            esposaMaeNome: input.esposaMaeNome?.toUpperCase(),
            esposaPaisTelefones: input.esposaPaisTelefones,

            endereco: input.endereco.toUpperCase(),
            numero: input.numero.toUpperCase(),
            bairro: input.bairro.toUpperCase(),
            cidade: input.cidade.toUpperCase(),
            estado: (input.estado || 'RJ').toUpperCase(),

            estadoCivil: input.estadoCivil || 'CASADOS',
            dataCasamento: new Date(input.dataCasamento),
            fazParteGvc: input.fazParteGvc ?? true,
            liderGvcNome: input.liderGvcNome?.toUpperCase(),
            liderGvcTelefone: input.liderGvcTelefone,

            visitaDiaSemana: input.visitaDiaSemana?.toUpperCase(),
            visitaHorario: input.visitaHorario,

            comoSoube: input.comoSoube,
            amigoNome: input.amigoNome?.toUpperCase(),
            amigoTelefone: input.amigoTelefone,

            valorCentavos: 99000,
            statusPagamento: 'PENDENTE',
            sincronizadoSheets: false,

            filhos: input.filhosDescricao?.length
              ? {
                  create: input.filhosDescricao
                    .filter((f) => f.trim().length > 0)
                    .map((f) => ({
                      nome: f.toUpperCase(),
                    })),
                }
              : undefined,
          },
          include: {
            filhos: true,
          },
        });

        return {
          success: true,
          source: 'supabase_prisma',
          data: record,
        };
      } catch (dbError: any) {
        console.error('Database insertion error, falling back to local cache:', dbError?.message);
      }
    }

    // Local JSON cache fallback
    const fallbackRecord = {
      id: `local_${Date.now()}`,
      voucherCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...input,
      valorCentavos: 99000,
      statusPagamento: 'PENDENTE',
    };

    const store = readFallbackStore();
    store.unshift(fallbackRecord);
    writeFallbackStore(store);

    return {
      success: true,
      source: 'local_cache_fallback',
      data: fallbackRecord,
    };
  }

  static async listInscriptions(search?: string) {
    if (isDatabaseConfigured) {
      try {
        const whereClause = search
          ? {
              OR: [
                { voucherCode: { contains: search, mode: 'insensitive' as const } },
                { maridoNome: { contains: search, mode: 'insensitive' as const } },
                { esposaNome: { contains: search, mode: 'insensitive' as const } },
                { maridoCelular: { contains: search } },
                { esposaCelular: { contains: search } },
              ],
            }
          : undefined;

        const records = await prisma.inscription.findMany({
          where: whereClause,
          include: { filhos: true },
          orderBy: { createdAt: 'desc' },
        });

        return records;
      } catch (e) {
        console.warn('Prisma findMany error, falling back to local store:', e);
      }
    }

    const store = readFallbackStore();
    if (search) {
      const q = search.toLowerCase();
      return store.filter(
        (r) =>
          r.voucherCode?.toLowerCase().includes(q) ||
          r.maridoNome?.toLowerCase().includes(q) ||
          r.esposaNome?.toLowerCase().includes(q)
      );
    }
    return store;
  }

  static async getByVoucher(voucherCode: string) {
    if (isDatabaseConfigured) {
      try {
        const record = await prisma.inscription.findUnique({
          where: { voucherCode },
          include: { filhos: true },
        });
        if (record) return record;
      } catch (e) {
        console.warn('Prisma findUnique error:', e);
      }
    }

    const store = readFallbackStore();
    return store.find((r) => r.voucherCode === voucherCode) || null;
  }

  static async getStats() {
    if (isDatabaseConfigured) {
      try {
        const totalInscriptions = await prisma.inscription.count();
        const totalChildren = await prisma.filho.count();
        const confirmedInscriptions = await prisma.inscription.count({
          where: { statusPagamento: 'CONFIRMADO' },
        });

        return {
          totalCouples: totalInscriptions,
          totalChildren,
          confirmedCouples: confirmedInscriptions,
          pendingCouples: totalInscriptions - confirmedInscriptions,
          limitCouples: 80,
          currentBatch: '1º Lote (R$ 990,00)',
        };
      } catch (e) {
        console.warn('Error reading stats from Prisma:', e);
      }
    }

    const store = readFallbackStore();
    return {
      totalCouples: store.length,
      totalChildren: store.filter((s) => s.temFilhos === true || s.temFilhos === 'SIM').length,
      confirmedCouples: 0,
      pendingCouples: store.length,
      limitCouples: 80,
      currentBatch: '1º Lote (R$ 990,00)',
    };
  }
}
