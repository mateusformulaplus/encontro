import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { RegistrationService } from '../services/registrationService.js';
import {
  GoogleSheetsRegistrationError,
  isSheetRegistrationPayload,
  saveRegistrationToGoogleSheets,
} from '../services/googleSheetsService.js';

export async function registrationRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  // Create registration in Google Sheets without persisting it in the database.
  fastify.post('/registrations', async (request, reply) => {
    try {
      if (!isSheetRegistrationPayload(request.body)) {
        return reply.status(400).send({
          success: false,
          error: 'Dados obrigatórios da inscrição estão ausentes ou inválidos.',
        });
      }

      await saveRegistrationToGoogleSheets(request.body);

      return reply.status(201).send({
        success: true,
        message: 'Inscrição registrada com sucesso!',
        voucherCode: request.body.voucherCode,
        paymentUrl: 'https://pay.sumup.com/b2c/XTV9S0IDS1',
      });
    } catch (err) {
      request.log.error({ err }, 'Google Sheets registration request failed');
      const statusCode =
        err instanceof GoogleSheetsRegistrationError ? err.statusCode : 502;
      return reply.status(statusCode).send({
        success: false,
        error:
          err instanceof GoogleSheetsRegistrationError
            ? err.message
            : 'Não foi possível enviar a inscrição para a planilha. Tente novamente.',
      });
    }
  });

  // 2. List Inscriptions
  fastify.get('/registrations', async (request, reply) => {
    try {
      const { search } = request.query as { search?: string };
      const records = await RegistrationService.listInscriptions(search);
      return reply.send({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao listar inscrições.',
      });
    }
  });

  // 3. Find by Voucher Code
  fastify.get('/registrations/:voucher', async (request, reply) => {
    try {
      const { voucher } = request.params as { voucher: string };
      const record = await RegistrationService.getByVoucher(voucher);

      if (!record) {
        return reply.status(404).send({
          success: false,
          error: 'Inscrição não encontrada para o código informado.',
        });
      }

      return reply.send({
        success: true,
        data: record,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar inscrição.',
      });
    }
  });

  // 4. Statistics
  fastify.get('/stats', async (_request, reply) => {
    try {
      const stats = await RegistrationService.getStats();
      return reply.send({
        success: true,
        data: stats,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao obter estatísticas.',
      });
    }
  });
}
