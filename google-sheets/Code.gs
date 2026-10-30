const SHEET_NAME = 'Inscrições do site';
const FIELD_LABELS = [
  ['maridoNome', 'Nome do marido'],
  ['esposaNome', 'Nome da esposa'],
  ['maridoNascimento', 'Nascimento do marido'],
  ['esposaNascimento', 'Nascimento da esposa'],
  ['endereco', 'Endereço'],
  ['numero', 'Número'],
  ['bairro', 'Bairro'],
  ['cidade', 'Cidade'],
  ['estado', 'Estado'],
  ['estadoCivil', 'Estado civil'],
  ['dataCasamento', 'Data do casamento'],
  ['grupoDeVida', 'Participa do Grupo de Vida'],
  ['liderGVC', 'Nome do líder do GVC'],
  ['telefoneLiderGVC', 'Telefone do líder do GVC'],
  ['temFilhos', 'Tem filhos'],
  ['quantosFilhos', 'Quantidade de filhos'],
  ['filho1', 'Nome/idade do filho 1'],
  ['filho2', 'Nome/idade do filho 2'],
  ['filho3', 'Nome/idade do filho 3'],
  ['maridoCelular', 'Celular do marido'],
  ['esposaCelular', 'Celular da esposa'],
  ['maridoEmail', 'E-mail do marido'],
  ['esposaEmail', 'E-mail da esposa'],
  ['maridoRedeSocial', 'Rede social do marido'],
  ['esposaRedeSocial', 'Rede social da esposa'],
  ['maridoProfissao', 'Profissão do marido'],
  ['maridoMembroIgreja', 'Marido é membro da igreja'],
  ['maridoQualIgreja', 'Igreja do marido'],
  ['maridoAfastado', 'Marido está afastado'],
  ['maridoDieta', 'Dieta/restrição do marido'],
  ['esposaProfissao', 'Profissão da esposa'],
  ['esposaMembroIgreja', 'Esposa é membro da igreja'],
  ['esposaQualIgreja', 'Igreja da esposa'],
  ['esposaAfastada', 'Esposa está afastada'],
  ['esposaDieta', 'Dieta/restrição da esposa'],
  ['maridoPaiNome', 'Nome do pai do marido'],
  ['maridoMaeNome', 'Nome da mãe do marido'],
  ['maridoPaisTelefones', 'Telefones dos pais do marido'],
  ['esposaPaiNome', 'Nome do pai da esposa'],
  ['esposaMaeNome', 'Nome da mãe da esposa'],
  ['esposaPaisTelefones', 'Telefones dos pais da esposa'],
  ['visitaDiaSemana', 'Dia da visita pastoral'],
  ['visitaHorario', 'Horário da visita pastoral'],
  ['comoSoube', 'Como soube do encontro'],
  ['amigoNome', 'Nome do amigo que indicou'],
  ['amigoTelefone', 'Telefone do amigo que indicou'],
  ['termoAceito', 'Termo aceito'],
];

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    const body = JSON.parse(e.postData.contents);
    const expectedToken = PropertiesService.getScriptProperties().getProperty('WEB_APP_TOKEN');

    if (!expectedToken || body.token !== expectedToken) {
      return jsonResponse({ success: false, error: 'Não autorizado.' });
    }

    if (
      typeof body.voucherCode !== 'string' ||
      !/^INVA72-\d{6}$/.test(body.voucherCode) ||
      !body.data ||
      typeof body.data !== 'object' ||
      !body.data.maridoNome ||
      !body.data.esposaNome
    ) {
      return jsonResponse({ success: false, error: 'Dados da inscrição inválidos.' });
    }

    lock.waitLock(10000);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
    const headers = [
      'Data da inscrição',
      'Código da inscrição',
      'Status do pagamento',
      'Forma de pagamento',
      'Data do pagamento',
      ...FIELD_LABELS.map(([, label]) => label),
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }

    if (sheet.getLastRow() > 1) {
      const existingCode = sheet
        .getRange(2, 2, sheet.getLastRow() - 1, 1)
        .createTextFinder(body.voucherCode)
        .matchEntireCell(true)
        .findNext();

      if (existingCode) {
        return jsonResponse({ success: true, duplicate: true });
      }
    }

    const row = [
      safeCellValue(body.createdAt || new Date().toISOString()),
      body.voucherCode,
      'PENDENTE',
      '',
      '',
      ...FIELD_LABELS.map(([key]) => safeCellValue(body.data[key])),
    ];
    sheet.appendRow(row);

    return jsonResponse({ success: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, error: 'Não foi possível registrar a inscrição.' });
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function safeCellValue(value) {
  if (typeof value === 'boolean') {
    return value ? 'SIM' : 'NÃO';
  }

  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value).slice(0, 2000);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
