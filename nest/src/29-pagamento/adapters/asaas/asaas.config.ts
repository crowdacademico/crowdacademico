import { ConfigService } from '@nestjs/config';

// =====================================================================================================================
// CONFIGURAÇÃO DO ASAAS: tudo vem de variáveis de ambiente (arquivo nest/.env). NENHUMA credencial entra no código, no git
// ou numa conversa. Cada variável abaixo diz O QUE preencher e ONDE achar o valor. Um modelo pronto para copiar está em
// nest/.env.asaas.example.
//
//   PAYMENT_PROVIDER=asaas
//     Liga este adapter. Sem ela (ou com "fake") o sistema usa o gateway de mentira em memória.
//
//   ASAAS_ENV=sandbox        (ou: production)
//     "sandbox" = ambiente de testes do Asaas, sem dinheiro de verdade. "production" = dinheiro real.
//     Em desenvolvimento, se você não preencher, vale "sandbox". Em PRODUÇÃO (NODE_ENV=production) é OBRIGATÓRIO escrever,
//     de propósito: nunca cair em produção por esquecimento. A URL da API sai daqui (sandbox: https://api-sandbox.asaas.com/v3;
//     production: https://api.asaas.com/v3). O sandbox e a produção são contas SEPARADAS, cada uma com sua própria chave.
//
//   ASAAS_API_KEY='$aact_hmlg_...'
//     A chave de API. Onde pegar: painel do Asaas (sandbox ou produção) > Menu do usuário > Integrações > Chaves de API >
//     gerar nova chave. O Asaas MOSTRA A CHAVE UMA ÚNICA VEZ: copie na hora. A chave de sandbox começa com $aact_hmlg_ e a de
//     produção com $aact_prod_. O "$" faz parte da chave. ESCREVA ENTRE ASPAS SIMPLES no .env (ASAAS_API_KEY='$aact_...'),
//     senão algumas ferramentas (docker compose, shell) tratam "$aact_..." como uma variável e apagam o começo da chave.
//     Este código recusa subir se a chave não parecer uma chave do Asaas, ou se for de um ambiente diferente de ASAAS_ENV.
//     Nunca cole essa chave em chat, issue, log ou commit. Se vazar, revogue-a no mesmo painel e gere outra.
//
//   ASAAS_WEBHOOK_TOKEN=<texto longo e aleatório que VOCÊ inventa>
//     A senha do webhook. Você escolhe o valor (mínimo 32 caracteres, até 255; sugestão: `openssl rand -hex 32`), coloca aqui
//     e COLA O MESMO VALOR no painel do Asaas, no campo "Token de autenticação" do webhook (Integrações > Webhooks).
//     O Asaas devolve esse valor no cabeçalho `asaas-access-token` de cada aviso, e o sistema só aceita avisos com o valor certo.
//     URL do webhook a cadastrar no Asaas:  https://SEU-DOMINIO/pagamento/webhook/asaas
//     Eventos a marcar: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_DELETED, PAYMENT_REFUNDED,
//     PAYMENT_PARTIALLY_REFUNDED, TRANSFER_DONE, TRANSFER_FAILED, TRANSFER_CANCELLED (os demais são aceitos e ignorados).
//     Tipo de envio: sequencial, e e-mail de aviso de falha no seu e-mail.
//
//   ASAAS_SAQUE_TOKEN=<outro texto longo e aleatório>      (opcional; se faltar, vale o ASAAS_WEBHOOK_TOKEN)
//     Senha da "validação de saque por webhook" (Integrações > Mecanismos de segurança). Com ela ligada, o Asaas pergunta ao
//     sistema, antes de executar CADA transferência, se ela é legítima, e o sistema só aprova a que corresponde a um repasse
//     dele (mesmo valor e mesma chave Pix). Isso impede que uma chave de API vazada tire dinheiro da conta. RECOMENDADO LIGAR.
//     URL a cadastrar: https://SEU-DOMINIO/pagamento/webhook/asaas/autorizacao-saque
//     MARQUE também "Ativar autorização de saque para estornos Pix": sem ela, cada devolução de contribuição fica parada
//     esperando autorização manual. O sistema aprova só a devolução de uma contribuição 'a devolver', no valor certo.
//
//   ASAAS_CUSTOMER_ID=cus_000000000000
//     O Asaas exige um "cliente" em toda cobrança. As contribuições aqui podem ser anônimas, então TODAS usam UM cliente
//     genérico, que você cria UMA VEZ: painel do Asaas > Clientes > Novo cliente (ex.: nome "Apoiador CrowdAcadêmico";
//     preencha o CPF/CNPJ que o painel pedir; DESLIGUE as notificações do cliente, para o Asaas não mandar e-mail por
//     contribuição). O código "cus_..." que aparece nele é o valor desta variável. Cada ambiente (sandbox/produção) tem o seu.
//
//   ASAAS_USER_AGENT=CrowdAcademico                         (opcional; padrão "CrowdAcademico")
//     Nome da aplicação. O Asaas exige o cabeçalho User-Agent em toda chamada. Sem espaços nem acentos.
//
//   ASAAS_TIMEOUT_MS=20000                                  (opcional; padrão 20000)
//     Quanto esperar por uma resposta do Asaas antes de desistir (e tratar como falha de rede, recuperável).
//
//   ASAAS_BUSCA_TRANSFERENCIA_PAGINAS=3                     (opcional; padrão 3)
//     Antes de pedir uma transferência, o sistema procura se ela já foi pedida (para nunca transferir duas vezes). Isto é
//     quantas páginas de 100 transferências recentes olhar. Aumente só se a conta fizer centenas de transferências por dia.
//
//   ASAAS_BASE_URL=                                         (opcional; só para testes)
//     Substitui a URL derivada de ASAAS_ENV (ex.: um servidor de mentira local). Deixe vazio na prática.
// =====================================================================================================================

export interface ConfiguracaoAsaas {
  ambiente: 'sandbox' | 'production';
  baseUrl: string;
  apiKey: string;
  webhookToken: string;
  saqueToken: string;
  customerId: string;
  userAgent: string;
  timeoutMs: number;
  paginasBuscaTransferencia: number;
}

const URL_SANDBOX = 'https://api-sandbox.asaas.com/v3';
const URL_PRODUCAO = 'https://api.asaas.com/v3';
const TAMANHO_MINIMO_TOKEN = 32;

// Lê e VALIDA tudo de uma vez. Qualquer problema vira UMA mensagem listando o que corrigir (e nunca imprime o valor de
// nenhuma credencial), e o boot falha alto: configuração de dinheiro errada não pode ser descoberta na primeira venda.
export function lerConfiguracaoAsaas(
  config: Pick<ConfigService, 'get'>,
): ConfiguracaoAsaas {
  const problemas: string[] = [];
  const texto = (chave: string): string | undefined => {
    const valor = config.get<string>(chave)?.trim();
    return valor ? valor : undefined;
  };
  const emProducao = config.get<string>('NODE_ENV') === 'production';

  const ambienteInformado = texto('ASAAS_ENV');
  let ambiente: 'sandbox' | 'production' = 'sandbox';
  if (ambienteInformado === undefined) {
    if (emProducao) {
      problemas.push(
        'ASAAS_ENV é obrigatório em produção: escreva "sandbox" ou "production".',
      );
    }
  } else if (
    ambienteInformado === 'sandbox' ||
    ambienteInformado === 'production'
  ) {
    ambiente = ambienteInformado;
  } else {
    problemas.push('ASAAS_ENV deve ser "sandbox" ou "production".');
  }

  const apiKey = texto('ASAAS_API_KEY');
  if (!apiKey) {
    problemas.push(
      'ASAAS_API_KEY ausente (chave de API: painel do Asaas > Integrações > Chaves de API).',
    );
  } else if (!apiKey.includes('aact_')) {
    problemas.push(
      'ASAAS_API_KEY não parece uma chave do Asaas (deve começar com $aact_). Se ela perdeu o "$", escreva o valor entre aspas simples no .env.',
    );
  } else if (ambiente === 'sandbox' && apiKey.includes('aact_prod_')) {
    problemas.push(
      'ASAAS_API_KEY é de PRODUÇÃO mas ASAAS_ENV é sandbox: as chaves não valem no outro ambiente.',
    );
  } else if (ambiente === 'production' && apiKey.includes('aact_hmlg_')) {
    problemas.push(
      'ASAAS_API_KEY é de SANDBOX mas ASAAS_ENV é production: as chaves não valem no outro ambiente.',
    );
  }

  const webhookToken = texto('ASAAS_WEBHOOK_TOKEN');
  if (!webhookToken || webhookToken.length < TAMANHO_MINIMO_TOKEN) {
    problemas.push(
      `ASAAS_WEBHOOK_TOKEN ausente ou curto (mínimo ${TAMANHO_MINIMO_TOKEN} caracteres; invente um e cole o mesmo no webhook do painel do Asaas).`,
    );
  }
  const saqueToken = texto('ASAAS_SAQUE_TOKEN') ?? webhookToken;
  if (
    texto('ASAAS_SAQUE_TOKEN') !== undefined &&
    (saqueToken?.length ?? 0) < TAMANHO_MINIMO_TOKEN
  ) {
    problemas.push(
      `ASAAS_SAQUE_TOKEN curto (mínimo ${TAMANHO_MINIMO_TOKEN} caracteres).`,
    );
  }

  const customerId = texto('ASAAS_CUSTOMER_ID');
  if (!customerId || !customerId.startsWith('cus_')) {
    problemas.push(
      'ASAAS_CUSTOMER_ID ausente ou inválido (deve começar com cus_; é o cliente genérico criado no painel do Asaas).',
    );
  }

  if (problemas.length > 0) {
    throw new Error(
      `PAYMENT_PROVIDER=asaas com configuração inválida:\n - ${problemas.join('\n - ')}`,
    );
  }

  const numero = (chave: string, padrao: number): number => {
    const valor = Number(texto(chave));
    return Number.isFinite(valor) && valor > 0 ? valor : padrao;
  };

  return {
    ambiente,
    baseUrl: (
      texto('ASAAS_BASE_URL') ??
      (ambiente === 'production' ? URL_PRODUCAO : URL_SANDBOX)
    ).replace(/\/+$/, ''),
    apiKey: apiKey as string,
    webhookToken: webhookToken as string,
    saqueToken: saqueToken as string,
    customerId: customerId as string,
    userAgent: texto('ASAAS_USER_AGENT') ?? 'CrowdAcademico',
    timeoutMs: numero('ASAAS_TIMEOUT_MS', 20_000),
    paginasBuscaTransferencia: Math.trunc(
      numero('ASAAS_BUSCA_TRANSFERENCIA_PAGINAS', 3),
    ),
  };
}
