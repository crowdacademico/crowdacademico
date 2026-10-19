import { GatewayPagamentoErro } from '../../ports/erro-gateway-pagamento';
import { type ResultadoConsultaChavePix } from '../../dto/resultado-chave-pix.dto';
import {
  type ResultadoRepasse,
  type StatusRepasseGateway,
} from '../../dto/resultado-repasse.dto';
import {
  type RepasseGatewayPort,
  type TipoChavePix,
  type TransferirParams,
} from '../../ports/repasse-gateway.port';
import { dataBrasilia, NOME_PROVEDOR } from './asaas-cobranca.adapter';
import { AsaasHttpClient } from './asaas-http.client';
import { type ConfiguracaoAsaas } from './asaas.config';
import {
  type AsaasChavePixExterna,
  type AsaasLista,
  type AsaasTransfer,
  TIPO_CHAVE_PIX_ASAAS,
} from './asaas.types';

// Formato da chave Pix que o Asaas espera: CPF/CNPJ só dígitos; telefone SEM +55 (DDD + número, 10 ou 11 dígitos, "Ex:
// 4799999999"); e-mail e chave aleatória como estão. O sistema guarda o telefone como "+55DDDNUMERO".
export function chaveParaAsaas(tipo: TipoChavePix, chave: string): string {
  if (tipo === 'telefone') {
    const digitos = chave.replace(/\D/g, '');
    return digitos.length > 11 && digitos.startsWith('55')
      ? digitos.slice(2)
      : digitos;
  }
  return chave;
}

export function statusRepasseDeDominio(status: string): StatusRepasseGateway {
  switch (status) {
    case 'DONE':
      return 'concluido';
    case 'FAILED':
    case 'CANCELLED':
      return 'erro';
    default:
      // PENDING, IN_BANK_PROCESSING/BANK_PROCESSING e BLOCKED: ainda não concluiu (bloqueada NÃO é concluída).
      return 'processando';
  }
}

// Transferência Pix para a chave do pesquisador (POST /transfers) + consulta de titularidade de chave (DICT).
//
// IDEMPOTÊNCIA: o Asaas não tem chave de idempotência. A chave do sistema (repasse.chave_idempotencia) vai em
// `externalReference` e, ANTES de pedir uma transferência, procura-se nas transferências recentes uma com essa referência
// (GET /transfers, até ASAAS_BUSCA_TRANSFERENCIA_PAGINAS páginas de 100). Existindo, devolve-a sem criar outra. Combinado
// com a validação de saque por webhook (só aprova uma transferência por repasse), é o que impede pagar o mesmo repasse duas
// vezes depois de um timeout ou de uma queda do processo. VERIFICAR NO SANDBOX: se a listagem não aceitar o filtro
// `dateCreated[ge]` (usado para limitar a busca), a busca refaz a chamada sem ele.
export class AsaasRepasseAdapter implements RepasseGatewayPort {
  readonly provedor = NOME_PROVEDOR;

  constructor(
    private readonly http: AsaasHttpClient,
    private readonly config: ConfiguracaoAsaas,
  ) {}

  async transferir(params: TransferirParams): Promise<ResultadoRepasse> {
    const existente = await this.buscarPorReferencia(params.chaveIdempotencia);
    if (existente) return this.paraResultado(existente);

    const criada = await this.http.requisitar<AsaasTransfer>(
      'POST',
      '/transfers',
      {
        corpo: {
          value: Math.round(params.valor * 100) / 100,
          pixAddressKey: chaveParaAsaas(
            params.destino.tipoChave,
            params.destino.chave,
          ),
          pixAddressKeyType: TIPO_CHAVE_PIX_ASAAS[params.destino.tipoChave],
          description: params.descricao?.slice(0, 140),
          externalReference: params.chaveIdempotencia,
        },
      },
    );
    return this.paraResultado(criada);
  }

  async consultarTransferencia(
    idTransferencia: string,
  ): Promise<ResultadoRepasse> {
    return this.paraResultado(
      await this.http.requisitar<AsaasTransfer>(
        'GET',
        `/transfers/${encodeURIComponent(idTransferencia)}`,
      ),
    );
  }

  // GET /pix/addressKeys/external?type=&key= : dados do titular de uma chave Pix de QUALQUER banco (DICT). Limites do
  // Asaas: 5 consultas por minuto por conta (excedeu => 429, que aqui vira REDE e o cadastro responde "tente de novo") e um
  // "token bucket" por tipo de chave. O CPF/CNPJ do titular volta MASCARADO; a comparação com o CPF da pessoa trata a
  // máscara (documentosCompativeis). Chave inexistente => 404 => existe:false.
  async consultarChavePix(
    destino: TransferirParams['destino'],
  ): Promise<ResultadoConsultaChavePix> {
    try {
      const dados = await this.http.requisitar<AsaasChavePixExterna>(
        'GET',
        '/pix/addressKeys/external',
        {
          query: {
            type: TIPO_CHAVE_PIX_ASAAS[destino.tipoChave],
            key: chaveParaAsaas(destino.tipoChave, destino.chave),
          },
        },
      );
      return {
        existe: true,
        documentoTitular: dados.owner?.cpfCnpj,
        nomeTitular: dados.owner?.name,
      };
    } catch (erro) {
      if (
        erro instanceof GatewayPagamentoErro &&
        erro.codigo === 'NAO_ENCONTRADO'
      ) {
        return { existe: false };
      }
      throw erro;
    }
  }

  private async buscarPorReferencia(
    referencia: string,
  ): Promise<AsaasTransfer | undefined> {
    const desde = dataBrasilia(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
    let comFiltroDeData = true;
    for (
      let pagina = 0;
      pagina < this.config.paginasBuscaTransferencia;
      pagina++
    ) {
      const consulta = {
        limit: 100,
        offset: pagina * 100,
        ...(comFiltroDeData ? { 'dateCreated[ge]': desde } : {}),
      };
      let lista: AsaasLista<AsaasTransfer>;
      try {
        lista = await this.http.requisitar<AsaasLista<AsaasTransfer>>(
          'GET',
          '/transfers',
          { query: consulta },
        );
      } catch (erro) {
        if (
          comFiltroDeData &&
          erro instanceof GatewayPagamentoErro &&
          erro.codigo === 'RECUSADO'
        ) {
          comFiltroDeData = false;
          pagina--;
          continue;
        }
        throw erro;
      }
      const achada = lista.data.find((t) => t.externalReference === referencia);
      if (achada) return achada;
      if (!lista.hasMore) return undefined;
    }
    return undefined;
  }

  private paraResultado(transferencia: AsaasTransfer): ResultadoRepasse {
    const status = statusRepasseDeDominio(transferencia.status);
    return {
      idTransferencia: transferencia.id,
      status,
      valor: Math.round(transferencia.value * 100) / 100,
      ...(status === 'erro'
        ? { motivoFalha: transferencia.failReason ?? transferencia.status }
        : {}),
    };
  }
}
