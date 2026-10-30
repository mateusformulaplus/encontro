-- =========================================================================
-- SCRIPT SQL PARA O SUPABASE (PostgreSQL)
-- Ministério Famílias Integradas — Igreja Nova Vida de Alcântara
-- 72º Encontro de Casais no Casarão Terra Santa (Itaboraí / RJ)
-- =========================================================================
-- Instruções:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com).
-- 2. No menu lateral, clique em "SQL Editor".
-- 3. Cole todo este script e clique no botão verde "Run" (Executar).
-- =========================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tipos ENUM
DO $$ BEGIN
  CREATE TYPE estado_civil_enum AS ENUM ('CASADOS', 'COMPANHEIROS', 'SOLTEIROS', 'DIVORCIADOS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE status_pagamento_enum AS ENUM ('PENDENTE', 'CONFIRMADO', 'CANCELADO', 'ESTORNADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela Principal de Inscrições de Casais
CREATE TABLE IF NOT EXISTS public.inscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('America/Sao_Paulo', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('America/Sao_Paulo', NOW()) NOT NULL,

  -- Informações do Marido
  marido_nome VARCHAR(255) NOT NULL,
  marido_nascimento DATE NOT NULL,
  marido_celular VARCHAR(30) NOT NULL,
  marido_email VARCHAR(255),
  marido_rede_social VARCHAR(100),
  marido_profissao VARCHAR(150) NOT NULL,
  marido_membro_igreja BOOLEAN DEFAULT TRUE NOT NULL,
  marido_qual_igreja VARCHAR(200) NOT NULL,
  marido_afastado BOOLEAN DEFAULT FALSE NOT NULL,
  marido_dieta TEXT,

  -- Filiação Marido
  marido_pai_nome VARCHAR(255),
  marido_mae_nome VARCHAR(255),
  marido_pais_telefones VARCHAR(100),

  -- Informações da Esposa
  esposa_nome VARCHAR(255) NOT NULL,
  esposa_nascimento DATE NOT NULL,
  esposa_celular VARCHAR(30) NOT NULL,
  esposa_email VARCHAR(255),
  esposa_rede_social VARCHAR(100),
  esposa_profissao VARCHAR(150) NOT NULL,
  esposa_membro_igreja BOOLEAN DEFAULT TRUE NOT NULL,
  esposa_qual_igreja VARCHAR(200) NOT NULL,
  esposa_afastada BOOLEAN DEFAULT FALSE NOT NULL,
  esposa_dieta TEXT,

  -- Filiação Esposa
  esposa_pai_nome VARCHAR(255),
  esposa_mae_nome VARCHAR(255),
  esposa_pais_telefones VARCHAR(100),

  -- Endereço Residencial
  endereco VARCHAR(255) NOT NULL,
  numero VARCHAR(50) NOT NULL,
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  estado VARCHAR(10) DEFAULT 'RJ' NOT NULL,

  -- Dados da União & Grupo de Vida
  estado_civil estado_civil_enum DEFAULT 'CASADOS' NOT NULL,
  data_casamento DATE NOT NULL,
  faz_parte_gvc BOOLEAN DEFAULT TRUE NOT NULL,
  lider_gvc_nome VARCHAR(200),
  lider_gvc_telefone VARCHAR(50),

  -- Visita Pastoral de Acolhimento
  visita_dia_semana VARCHAR(50),
  visita_horario VARCHAR(50),

  -- Pesquisa de Divulgação
  como_soube VARCHAR(150) NOT NULL,
  amigo_nome VARCHAR(200),
  amigo_telefone VARCHAR(50),

  -- Dados Financeiros & PagBank
  lote VARCHAR(50) DEFAULT '1º LOTE' NOT NULL,
  valor_centavos INTEGER DEFAULT 99000 NOT NULL, -- R$ 990,00
  status_pagamento status_pagamento_enum DEFAULT 'PENDENTE' NOT NULL,
  pagbank_transacao_id VARCHAR(150),
  sincronizado_sheets BOOLEAN DEFAULT FALSE NOT NULL
);

-- 3. Tabela de Filhos dos Casais (1:N)
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscription_id UUID NOT NULL REFERENCES public.inscriptions(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  idade INTEGER,
  celular VARCHAR(50),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('America/Sao_Paulo', NOW()) NOT NULL
);

-- 4. Tabela de Configuração e Lotes do Evento
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) DEFAULT '72º Encontro de Casais INVA' NOT NULL,
  data_inicio DATE DEFAULT '2027-05-01' NOT NULL,
  data_fim DATE DEFAULT '2027-05-02' NOT NULL,
  local_nome VARCHAR(255) DEFAULT 'Casarão Terra Santa' NOT NULL,
  cidade VARCHAR(100) DEFAULT 'Itaboraí' NOT NULL,
  estado VARCHAR(10) DEFAULT 'RJ' NOT NULL,
  valor_lote1 INTEGER DEFAULT 99000 NOT NULL,
  limite_casais INTEGER DEFAULT 80 NOT NULL,
  inscricoes_abertas BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('America/Sao_Paulo', NOW()) NOT NULL
);

-- Inserir evento padrão se não existir
INSERT INTO public.events (nome, data_inicio, data_fim, local_nome, cidade, estado, valor_lote1, limite_casais, inscricoes_abertas)
SELECT '72º Encontro de Casais INVA', '2027-05-01', '2027-05-02', 'Casarão Terra Santa', 'Itaboraí', 'RJ', 99000, 80, true
WHERE NOT EXISTS (SELECT 1 FROM public.events LIMIT 1);

-- 5. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_inscriptions_voucher ON public.inscriptions (voucher_code);
CREATE INDEX IF NOT EXISTS idx_inscriptions_marido_cel ON public.inscriptions (marido_celular);
CREATE INDEX IF NOT EXISTS idx_inscriptions_esposa_cel ON public.inscriptions (esposa_celular);
CREATE INDEX IF NOT EXISTS idx_inscriptions_status_pagamento ON public.inscriptions (status_pagamento);
CREATE INDEX IF NOT EXISTS idx_inscriptions_created_at ON public.inscriptions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_children_inscription_id ON public.children (inscription_id);

-- 6. Trigger para atualização automática da coluna updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('America/Sao_Paulo', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_inscriptions_timestamp ON public.inscriptions;
CREATE TRIGGER trigger_update_inscriptions_timestamp
BEFORE UPDATE ON public.inscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Configuração de RLS (Row Level Security)
ALTER TABLE public.inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir inserção pública (qualquer casal pode se inscrever pelo site)
CREATE POLICY "Permitir insercao publica de inscricoes"
ON public.inscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Permitir insercao de filhos"
ON public.children
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política 2: Permitir leitura pública limitada por voucher_code (para consulta de comprovante)
CREATE POLICY "Permitir consulta por voucher"
ON public.inscriptions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir leitura de filhos"
ON public.children
FOR SELECT
TO anon, authenticated
USING (true);

-- Política 3: Evento público visível para todos
CREATE POLICY "Permitir leitura de dados do evento"
ON public.events
FOR SELECT
TO anon, authenticated
USING (true);

-- 8. View de Resumo Executivo para a Liderança
CREATE OR REPLACE VIEW public.vw_resumo_inscricoes_casais AS
SELECT
  i.voucher_code AS "Código Voucher",
  TO_CHAR(i.created_at, 'DD/MM/YYYY HH24:MI') AS "Data/Hora Cadastro",
  i.marido_nome AS "Marido",
  i.esposa_nome AS "Esposa",
  i.marido_celular AS "Celular Marido",
  i.esposa_celular AS "Celular Esposa",
  i.cidade AS "Cidade",
  i.estado_civil AS "Estado Civil",
  TO_CHAR(i.data_casamento, 'DD/MM/YYYY') AS "Data Casamento",
  CASE WHEN i.faz_parte_gvc THEN 'SIM' ELSE 'NÃO' END AS "Faz Parte GVC",
  i.marido_qual_igreja AS "Igreja Marido",
  i.esposa_qual_igreja AS "Igreja Esposa",
  i.status_pagamento AS "Status Pagamento",
  (SELECT COUNT(*) FROM public.children c WHERE c.inscription_id = i.id) AS "Qtd Filhos"
FROM public.inscriptions i
ORDER BY i.created_at DESC;
