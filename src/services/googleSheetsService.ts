export interface SheetRegistrationPayload {
  voucherCode: string;
  createdAt?: string;
  data: Record<string, unknown>;
}

export class GoogleSheetsRegistrationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'GoogleSheetsRegistrationError';
  }
}

export function isSheetRegistrationPayload(value: unknown): value is SheetRegistrationPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const body = value as Record<string, unknown>;
  const data = body.data;

  if (
    typeof body.voucherCode !== 'string' ||
    !/^INVA72-\d{6}$/.test(body.voucherCode) ||
    !data ||
    typeof data !== 'object'
  ) {
    return false;
  }

  const registration = data as Record<string, unknown>;
  return ['maridoNome', 'esposaNome', 'maridoCelular', 'esposaCelular'].every(
    (field) =>
      typeof registration[field] === 'string' &&
      Boolean((registration[field] as string).trim()),
  );
}

export async function saveRegistrationToGoogleSheets(
  payload: SheetRegistrationPayload,
): Promise<void> {
  const webAppUrl = process.env.GOOGLE_SHEETS_WEB_APP_URL;
  const token = process.env.GOOGLE_SHEETS_WEB_APP_TOKEN;

  if (!webAppUrl || !token) {
    throw new GoogleSheetsRegistrationError(
      'A integração com a planilha ainda não foi configurada.',
      503,
    );
  }

  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, token }),
      signal: AbortSignal.timeout(30000),
    });
    const result = (await response.json()) as { success?: boolean; error?: string };

    if (!response.ok || !result.success) {
      throw new GoogleSheetsRegistrationError(
        result.error || 'Não foi possível salvar a inscrição na planilha.',
        502,
      );
    }
  } catch (error) {
    if (error instanceof GoogleSheetsRegistrationError) {
      throw error;
    }

    throw new GoogleSheetsRegistrationError(
      'Não foi possível enviar a inscrição para a planilha. Tente novamente.',
      502,
    );
  }
}
