# Integração com a planilha de inscrições

Novas inscrições são encaminhadas pelo backend para o Google Sheets via Google Apps Script. Elas não são gravadas no Prisma, no Supabase nem no armazenamento local do navegador. A planilha fornecida é usada por um novo separador chamado **Inscrições do site**; as respostas existentes do Forms permanecem intactas.

## Configuração da planilha

1. Abra a planilha e escolha **Extensões > Apps Script**.
2. Substitua o conteúdo do editor pelo arquivo `backend/google-sheets/Code.gs` e salve.
3. Em **Configurações do projeto > Propriedades do script**, crie `WEB_APP_TOKEN` com um valor longo e aleatório. Use o mesmo valor na variável de ambiente do backend, nunca no frontend.
4. Escolha **Implantar > Nova implantação > Aplicativo da Web**. Configure **Executar como: eu** e **Quem pode acessar: qualquer pessoa**; o token protege as gravações.
5. Autorize o script quando solicitado e copie a URL do aplicativo da Web, que termina em `/exec`.
6. Configure no ambiente do backend:

   ```env
   GOOGLE_SHEETS_WEB_APP_URL="URL_DO_APPS_SCRIPT/exec"
   GOOGLE_SHEETS_WEB_APP_TOKEN="O_MESMO_TOKEN_WEB_APP_TOKEN"
   ```

7. Para o ambiente local, copie a URL e o token também para `backend/.env`. Para a Vercel, adicione ambos em **Project > Settings > Environment Variables** nos ambientes usados (Production e, se necessário, Preview/Development) e faça um novo deploy.
8. Faça uma inscrição de teste e confirme a linha na aba **Inscrições do site**.

Cada linha começa com data, código de inscrição e status **PENDENTE**, além das colunas para forma e data de pagamento. A equipe pode mudar o status para **PAGO** e preencher os dados do pagamento manualmente após confirmar o recebimento. A planilha contém dados pessoais; restrinja o acesso às pessoas responsáveis.

## Backend

O servidor Fastify continua sendo o intermediário para manter o token fora do navegador. `POST /api/registrations` grava na planilha; se a integração não estiver configurada ou a gravação falhar, a API retorna erro e o formulário não mostra sucesso. As rotas de consulta antigas do Prisma não recebem essas novas inscrições.

Para desenvolvimento local, copie `backend/.env.example` para `backend/.env`, configure as duas variáveis e inicie o backend com `npm run dev:backend`.
