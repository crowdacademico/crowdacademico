import { GatewayPagamentoErro } from '../../dto/erro-gateway-pagamento';
import { type ConfiguracaoAsaas } from './asaas.config';
import { type AsaasErroCorpo } from './asaas.types';

export type MetodoHttp = 'GET' | 'POST' | 'DELETE';

export interface OpcoesRequisicao {
  query?: Record<string, string | number | undefined>;
  corpo?: unknown;
}

// Cliente HTTP do Asaas: a ÚNICA porta de saída para a rede deste adapter. Responsabilidades:
//   - cabeçalhos obrigatórios: `access_token` (a chave de API; o Asaas NÃO usa "Authorization: Bearer"), `User-Agent`
//     (exigido pelo Asaas) e Content-Type;
//   - timeout (AbortController);
//   - traduzir TODO erro para GatewayPagamentoErro (o resto do sistema decide só por `codigo` e `recuperavel`).
//
// Tradução de erros (status HTTP do provedor => código do sistema):
//   falha de rede / timeout / 408 / 429 / 5xx  => REDE, recuperável (tentar de novo depois)
//   401 / 403 (chave inválida, revogada, IP)   => NAO_CONFIGURADO, RECUPERÁVEL (vale tentar de novo quando a chave for
//                                                  corrigida; os workers de estorno pausam nesse código sem gastar tentativa)
//   404                                        => NAO_ENCONTRADO, definitivo
//   400 cuja mensagem fala de "saldo"          => SALDO_INSUFICIENTE, recuperável (o saldo pode ser reposto)
//   demais 4xx                                 => RECUSADO, definitivo
//
// Nunca registra nem devolve a chave de API, o corpo enviado ou a chave Pix de ninguém: a mensagem de erro leva só o
// status e a descrição que o próprio Asaas devolveu.
export class AsaasHttpClient {
  constructor(
    private readonly config: ConfiguracaoAsaas,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async requisitar<T>(
    metodo: MetodoHttp,
    caminho: string,
    opcoes: OpcoesRequisicao = {},
  ): Promise<T> {
    const url = new URL(this.config.baseUrl + caminho);
    for (const [chave, valor] of Object.entries(opcoes.query ?? {})) {
      if (valor !== undefined) url.searchParams.set(chave, String(valor));
    }

    const controlador = new AbortController();
    const relogio = setTimeout(
      () => controlador.abort(),
      this.config.timeoutMs,
    );
    let resposta: Response;
    try {
      resposta = await this.fetchImpl(url, {
        method: metodo,
        headers: {
          access_token: this.config.apiKey,
          'User-Agent': this.config.userAgent,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        // GET/DELETE sem corpo: o Asaas responde 403 se um GET vier com body.
        body:
          opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
        signal: controlador.signal,
      });
    } catch {
      throw new GatewayPagamentoErro(
        'REDE',
        'Não foi possível falar com o provedor de pagamento.',
        true,
      );
    } finally {
      clearTimeout(relogio);
    }

    const texto = await resposta.text().catch(() => '');
    let json: unknown = null;
    if (texto) {
      try {
        json = JSON.parse(texto);
      } catch {
        json = null;
      }
    }

    if (!resposta.ok) {
      throw this.traduzirErro(resposta.status, json as AsaasErroCorpo | null);
    }
    return json as T;
  }

  private traduzirErro(
    status: number,
    corpo: AsaasErroCorpo | null,
  ): GatewayPagamentoErro {
    const descricao =
      (corpo?.errors ?? [])
        .map((e) => e.description)
        .filter((d): d is string => !!d)
        .join('; ') || 'sem detalhe';
    const mensagem = `Provedor respondeu ${status}: ${descricao}`;

    if (status === 401 || status === 403) {
      return new GatewayPagamentoErro(
        'NAO_CONFIGURADO',
        `Credenciais recusadas pelo provedor (${status}). Confira ASAAS_API_KEY, o ambiente e a whitelist de IPs.`,
        true,
        status,
      );
    }
    if (status === 404) {
      return new GatewayPagamentoErro(
        'NAO_ENCONTRADO',
        mensagem,
        false,
        status,
      );
    }
    if (status === 408 || status === 429 || status >= 500) {
      return new GatewayPagamentoErro('REDE', mensagem, true, status);
    }
    if (status === 400 && /saldo/i.test(descricao)) {
      return new GatewayPagamentoErro(
        'SALDO_INSUFICIENTE',
        mensagem,
        true,
        status,
      );
    }
    return new GatewayPagamentoErro('RECUSADO', mensagem, false, status);
  }
}
