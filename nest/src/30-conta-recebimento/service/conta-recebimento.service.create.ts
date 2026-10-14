import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import type { ContaRecebimentoUsuarioEntity } from '../../commons/database/db.types';
import { executarTransacaoCurta } from '../../commons/database/transacao-curta.util';
import { cifrarChavePix } from '../../commons/seguranca/chave-pix-cifra.util';
import { decifrarCpf } from '../../commons/seguranca/cpf-cifra.util';
import { GatewayPagamentoErro } from '../../29-pagamento/dto/erro-gateway-pagamento';
import { type ResultadoConsultaChavePix } from '../../29-pagamento/dto/resultado-chave-pix.dto';
import {
  REPASSE_GATEWAY,
  type RepasseGatewayPort,
} from '../../29-pagamento/ports/repasse-gateway.port';
import {
  CONTA_RECEBIMENTO_COLUNAS_SELECT,
  MENSAGEM_CHAVE_DE_OUTRA_PESSOA,
  MENSAGEM_CHAVE_NAO_ENCONTRADA,
  MENSAGEM_DICT_INDISPONIVEL,
} from '../constants/conta-recebimento.constants';
import { ContaRecebimentoConverter } from '../dto/converter/conta-recebimento.converter';
import { ContaRecebimentoRequestCreate } from '../dto/request/conta-recebimento.request-create';
import { ContaRecebimentoResponse } from '../dto/response/conta-recebimento.response';
import {
  documentosCompativeis,
  normalizarChavePix,
} from '../util/chave-pix.util';

// POST /conta-recebimento: cadastra a chave Pix onde a pessoa recebe (repasse ao pesquisador; reembolso manual a quem
// apoiou). Ordem:
//   1. normaliza e valida a chave pelo tipo;
//   2. lê o CPF da pessoa, se ela tem perfil de pesquisador (transação curta);
//   3. consulta a chave no diretório do Banco Central (DICT) pelo provedor, FORA de qualquer transação (por isso a rota é
//      @SemTransacaoGlobal e este service usa PG_POOL: a consulta é uma espera externa);
//   4. decide a titularidade: com CPF conhecido, o documento do titular da chave PRECISA bater (senão 422: ninguém
//      cadastra a chave de outra pessoa para desviar repasse); sem CPF conhecido (apoiador comum), ou se o provedor não
//      informou o documento, a chave é guardada SEM titularidade verificada e o worker de repasse não a usa;
//   5. numa transação curta: desativa a conta ativa anterior (só existe uma ativa por pessoa) e grava a nova, com a
//      chave CIFRADA e titularidade_verificada_em preenchido só no caso verificado.
@Injectable()
export class ContaRecebimentoServiceCreate {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REPASSE_GATEWAY) private readonly gateway: RepasseGatewayPort,
  ) {}

  async executar(
    dto: ContaRecebimentoRequestCreate,
    idUsuario: number,
  ): Promise<ContaRecebimentoResponse> {
    const chave = normalizarChavePix(dto.tipoChave, dto.chave);

    const cpfPessoa = await this.lerCpfDaPessoa(idUsuario);

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

    let verificada = false;
    if (cpfPessoa && consulta.documentoTitular) {
      if (!documentosCompativeis(cpfPessoa, consulta.documentoTitular)) {
        throw new UnprocessableEntityException(MENSAGEM_CHAVE_DE_OUTRA_PESSOA);
      }
      verificada = true;
    }

    const entity = await executarTransacaoCurta(
      this.pool,
      { idUsuario },
      async (client) => {
        await client.query(
          'UPDATE conta_recebimento_usuario SET ativa = FALSE WHERE id_usuario = $1 AND ativa',
          [idUsuario],
        );
        const inserida = await client.query<ContaRecebimentoUsuarioEntity>(
          `INSERT INTO conta_recebimento_usuario (id_usuario, tipo_chave, chave_criptografada, titularidade_verificada_em)
           VALUES ($1, $2::tipo_chave_pix, $3, CASE WHEN $4::boolean THEN NOW() END)
           RETURNING ${CONTA_RECEBIMENTO_COLUNAS_SELECT.join(', ')}`,
          [idUsuario, dto.tipoChave, cifrarChavePix(chave), verificada],
        );
        return inserida.rows[0];
      },
    );
    return ContaRecebimentoConverter.paraResponseDto(entity);
  }

  // CPF só dígitos, ou null para quem não tem perfil de pesquisador (apoiador comum).
  private async lerCpfDaPessoa(idUsuario: number): Promise<string | null> {
    const cifrado = await executarTransacaoCurta(
      this.pool,
      { idUsuario },
      async (client) => {
        const resultado = await client.query<{ cpf_criptografado: string }>(
          'SELECT cpf_criptografado FROM perfil_pesquisador WHERE id_usuario = $1',
          [idUsuario],
        );
        return (
          (resultado.rows[0] as { cpf_criptografado: string } | undefined)
            ?.cpf_criptografado ?? null
        );
      },
    );
    return cifrado ? decifrarCpf(cifrado) : null;
  }
}
