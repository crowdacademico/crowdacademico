import {
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { executarTransacaoCurta } from '../../commons/database/transacao-curta.util';
import { cifrarChavePix } from '../../commons/seguranca/chave-pix-cifra.util';
import { decifrarCpf } from '../../commons/seguranca/cpf-cifra.util';
import { GatewayPagamentoErro } from '../../29-pagamento/ports/erro-gateway-pagamento';
import { type ResultadoConsultaChavePix } from '../../29-pagamento/dto/resultado-chave-pix.dto';
import {
  REPASSE_GATEWAY,
  type RepasseGatewayPort,
} from '../../29-pagamento/ports/repasse-gateway.port';
import {
  MENSAGEM_CHAVE_DE_OUTRA_PESSOA,
  MENSAGEM_CHAVE_NAO_ENCONTRADA,
  MENSAGEM_DICT_INDISPONIVEL,
  MENSAGEM_SO_PESQUISADOR,
} from '../constants/conta-recebimento.constants';
import {
  ContaRecebimentoConverter,
  type LinhaChavePix,
} from '../dto/converter/conta-recebimento.converter';
import { ContaRecebimentoRequestCreate } from '../dto/request/conta-recebimento.request-create';
import { ContaRecebimentoResponse } from '../dto/response/conta-recebimento.response';
import {
  documentosCompativeis,
  normalizarChavePix,
} from '../util/chave-pix.util';

// POST /conta-recebimento: cadastra (ou troca) a chave Pix onde o pesquisador recebe o repasse. Ordem:
//   1. normaliza e valida a chave pelo tipo;
//   2. lê o CPF do perfil de pesquisador (transação curta); sem perfil, 403;
//   3. consulta a chave no diretório do Banco Central (DICT) pelo provedor, FORA de qualquer transação (por isso a rota é
//      @SemTransacaoGlobal e este service usa PG_POOL: a consulta é uma espera externa);
//   4. decide a titularidade: o documento do titular da chave PRECISA bater com o CPF (senão 422: ninguém cadastra a chave
//      de outra pessoa para desviar repasse); se o provedor não informou o documento, a chave é guardada SEM titularidade
//      verificada e o worker de repasse não a usa;
//   5. grava tipo, chave CIFRADA e chave_pix_verificada_em (só no caso verificado) no perfil, numa transação curta.
@Injectable()
export class ContaRecebimentoServiceCreate {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REPASSE_GATEWAY) private readonly gateway: RepasseGatewayPort,
  ) {}

  async executar(
    dto: ContaRecebimentoRequestCreate,
    idUsuario: number,
  ): Promise<ContaRecebimentoResponse | null> {
    const chave = normalizarChavePix(dto.tipoChave, dto.chave);
    const cpfPessoa = await this.lerCpfDoPesquisador(idUsuario);

    let consulta: ResultadoConsultaChavePix;
    try {
      consulta = await this.gateway.consultarChavePix({
        tipoChave: dto.tipoChave,
        chave,
      });
    } catch (erro) {
      if (erro instanceof GatewayPagamentoErro) {
        throw new ServiceUnavailableException(MENSAGEM_DICT_INDISPONIVEL);
      }
      throw erro;
    }
    if (!consulta.existe) {
      throw new UnprocessableEntityException(MENSAGEM_CHAVE_NAO_ENCONTRADA);
    }
    if (
      consulta.documentoTitular &&
      !documentosCompativeis(cpfPessoa, consulta.documentoTitular)
    ) {
      throw new UnprocessableEntityException(MENSAGEM_CHAVE_DE_OUTRA_PESSOA);
    }
    const verificada = Boolean(consulta.documentoTitular);

    const linha = await executarTransacaoCurta(
      this.pool,
      { idUsuario },
      async (client) => {
        const resultado = await client.query<LinhaChavePix>(
          `UPDATE perfil_pesquisador
           SET tipo_chave_pix = $2::tipo_chave_pix, chave_pix_criptografada = $3,
               chave_pix_verificada_em = CASE WHEN $4::boolean THEN NOW() END
           WHERE id_usuario = $1
           RETURNING tipo_chave_pix, chave_pix_criptografada, chave_pix_verificada_em`,
          [idUsuario, dto.tipoChave, cifrarChavePix(chave), verificada],
        );
        return resultado.rows[0];
      },
    );
    return ContaRecebimentoConverter.paraResponseDto(linha);
  }

  // CPF só dígitos. Sem perfil de pesquisador, 403 antes de consultar o provedor.
  private async lerCpfDoPesquisador(idUsuario: number): Promise<string> {
    const cifrado = await executarTransacaoCurta(
      this.pool,
      { idUsuario },
      async (client) => {
        const resultado = await client.query<{ cpf_criptografado: string }>(
          'SELECT cpf_criptografado FROM perfil_pesquisador WHERE id_usuario = $1',
          [idUsuario],
        );
        return (resultado.rows[0] as { cpf_criptografado: string } | undefined)
          ?.cpf_criptografado;
      },
    );
    if (!cifrado) {
      throw new ForbiddenException(MENSAGEM_SO_PESQUISADOR);
    }
    return decifrarCpf(cifrado);
  }
}
