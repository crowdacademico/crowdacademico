import { randomUUID } from 'crypto';
import {
  BadGatewayException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CODIGO_TERMO_PENDENTE } from '../../3-auth/guards/auth.guard.require-auth';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { PG_POOL } from '../../commons/database/database.constants';
import { executarTransacaoCurta } from '../../commons/database/transacao-curta.util';
import { GatewayPagamentoErro } from '../../29-pagamento/dto/erro-gateway-pagamento';
import { ResultadoCobranca } from '../../29-pagamento/dto/resultado-cobranca.dto';
import {
  COBRANCA_GATEWAY,
  type CobrancaGatewayPort,
} from '../../29-pagamento/ports/cobranca-gateway.port';
import {
  MENSAGEM_CAMPANHA_NAO_ENCONTRADA,
  MENSAGEM_COBRANCA_FALHOU,
  MENSAGEM_COBRANCA_RECUSADA,
  MENSAGEM_PAGAMENTO_INDISPONIVEL,
  calcularExpiracaoPix,
} from '../constants/contribuicao.constants';
import {
  ContribuicaoConverter,
  valorCobrado,
  type LinhaContribuicao,
} from '../dto/converter/contribuicao.converter';
import { ContribuicaoRequestCreate } from '../dto/request/contribuicao.request-create';
import { ContribuicaoResponseCreate } from '../dto/response/contribuicao.response-create';

interface LinhaCampanha {
  titulo: string;
  data_fim: Date | null;
  // numeric volta do pg como string; ausente/ilegível cai no padrão (ver calcularExpiracaoPix).
  pix_validade_horas?: string | number | null;
}

// POST /contribuicao. A rota é @SemTransacaoGlobal() (ver sem-transacao-global.decorator.ts): chamar o gateway de
// pagamento pode levar segundos, e fazer isso com um client do pool preso numa transação aberta esgotaria o pool.
// Por isso o trabalho é em TRÊS passos, cada banco-curto separado do gateway:
//
//   1. transação curta: grava a contribuição como 'pendente' e COMITA. O comite vem antes do gateway de propósito:
//      se o processo morrer logo depois, sobra uma 'pendente' (estado válido e recuperável), nunca um pagamento
//      sem registro nenhum no nosso lado;
//   2. gateway, FORA de qualquer transação (nenhum client do pool está em uso neste momento);
//   3. transação curta: registra o id da cobrança via atualizar_status_contribuicao() (05, [05-K-2]).
//
// Regras de negócio que NÃO são checadas aqui, porque o banco já as garante e o PostgresExceptionFilter as traduz:
// campanha ativa e dentro do prazo (91016/91017), valor mínimo configurável (90014), all-or-nothing só PIX (90007).
// O que se checa aqui antes do INSERT é só o que dá para dizer ao usuário antes de gravar lixo (campanha
// inexistente) e o que o banco não sabe (termo pendente, que é do guard).
@Injectable()
export class ContribuicaoServiceCreate {
  private readonly logger = new Logger(ContribuicaoServiceCreate.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(COBRANCA_GATEWAY) private readonly gateway: CobrancaGatewayPort,
  ) {}

  async executar(
    dto: ContribuicaoRequestCreate,
    usuario: UsuarioAutenticado | undefined,
  ): Promise<ContribuicaoResponseCreate> {
    // Rota @Publico() (contribuir não exige conta, RF-073): o guard de autenticação não roda a checagem de termo
    // pendente nela. Quem ESTÁ logado e com termo pendente recebe o mesmo 403 de qualquer outra rota.
    if (usuario?.termoPendente) {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: CODIGO_TERMO_PENDENTE,
        message:
          'Há uma versão nova do Termo de Uso. Leia e aceite para continuar usando a plataforma.',
      });
    }

    const idUsuario = usuario?.idUsuario ?? null;
    // Gerado AQUI e não pelo DEFAULT do banco: quem contribui sem conta só consegue ler de volta a própria linha
    // (INSERT ... RETURNING) se app.token_sessao_atual já estiver setado com este valor
    // (pol_contribuicao_anon_select, 04). Também é a chave de idempotência da cobrança no gateway.
    const tokenSessao = randomUUID();

    // Passo 1
    const { contribuicao, campanha } = await executarTransacaoCurta(
      this.pool,
      { idUsuario, tokenSessao },
      async (client) => {
        const resCampanha = await client.query<LinhaCampanha>(
          "SELECT titulo, data_fim, public.config_numero('pix_validade_horas', 24) AS pix_validade_horas FROM campanha WHERE id_campanha = $1",
          [dto.idCampanha],
        );
        // Campanha que a RLS esconde é indistinguível de campanha inexistente (de propósito).
        const campanhaLida = resCampanha.rows[0] as LinhaCampanha | undefined;
        if (!campanhaLida) {
          throw new NotFoundException(MENSAGEM_CAMPANHA_NAO_ENCONTRADA);
        }
        // `provedor` é obrigatório aqui: o DEFAULT da coluna é 'asaas', e uma contribuição criada pelo Fake
        // ficaria rotulada com o provedor errado.
        const resContribuicao = await client.query<LinhaContribuicao>(
          `INSERT INTO contribuicao
             (id_campanha, id_usuario, valor, meio_pagamento, anonima, token_sessao, provedor)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id_contribuicao, id_campanha, valor, taxa_pagamento, meio_pagamento, status, token_sessao, criado_em`,
          [
            dto.idCampanha,
            idUsuario,
            dto.valor,
            dto.meioPagamento,
            idUsuario === null ? true : (dto.anonima ?? false),
            tokenSessao,
            this.gateway.provedor,
          ],
        );
        return {
          contribuicao: resContribuicao.rows[0],
          campanha: campanhaLida,
        };
      },
    );

    // Passo 2: nenhum client do pool está em uso daqui até o passo 3.
    let cobranca: ResultadoCobranca;
    try {
      cobranca = await this.gateway.criarCobranca({
        chaveIdempotencia: tokenSessao,
        valor: valorCobrado(contribuicao),
        meioPagamento: dto.meioPagamento,
        expiraEm: calcularExpiracaoPix(
          campanha.data_fim,
          Number(campanha.pix_validade_horas),
        ),
        descricao: `Contribuição para: ${campanha.titulo}`.slice(0, 140),
      });
    } catch (erro) {
      await this.marcarComoErro(contribuicao.id_contribuicao, idUsuario);
      throw this.traduzirErroDoGateway(erro, contribuicao.id_contribuicao);
    }

    // Passo 3: vincula a cobrança do gateway à contribuição (o webhook acha a contribuição por este id).
    try {
      await executarTransacaoCurta(this.pool, { idUsuario }, (client) =>
        client.query(
          `SELECT public.atualizar_status_contribuicao($1::int, 'pendente'::status_contribuicao, $2::varchar)`,
          [contribuicao.id_contribuicao, cobranca.idCobranca],
        ),
      );
    } catch (erro) {
      // A cobrança EXISTE no gateway mas não conseguimos ligá-la à contribuição: se alguém pagar, o webhook não
      // acharia a contribuição. Por isso não devolvemos o QR (ninguém deve pagar algo que não rastreamos), cancelamos a
      // cobrança no gateway e deixamos o rastro no log com os dois ids, para o suporte caso o cancelamento também falhe.
      this.logger.error(
        `Cobrança criada no gateway mas não vinculada: contribuicao=${contribuicao.id_contribuicao} provedor=${this.gateway.provedor} cobranca=${cobranca.idCobranca}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      await this.gateway
        .cancelarCobranca(cobranca.idCobranca)
        .catch((falha: unknown) =>
          this.logger.error(
            `Não foi possível cancelar a cobrança não vinculada ${cobranca.idCobranca}: ${falha instanceof Error ? falha.message : String(falha)}`,
          ),
        );
      await this.marcarComoErro(contribuicao.id_contribuicao, idUsuario);
      throw new ServiceUnavailableException(MENSAGEM_COBRANCA_FALHOU);
    }

    return ContribuicaoConverter.paraResponseCreate(contribuicao, cobranca);
  }

  // Melhor esforço: se nem isto der, fica 'pendente' sem cobrança, que é um estado válido e recuperável. Nunca
  // lança, para não esconder o erro real (o do gateway) atrás de um erro de limpeza.
  private async marcarComoErro(
    idContribuicao: number,
    idUsuario: number | null,
  ): Promise<void> {
    try {
      await executarTransacaoCurta(this.pool, { idUsuario }, (client) =>
        client.query(
          `SELECT public.atualizar_status_contribuicao($1::int, 'erro'::status_contribuicao)`,
          [idContribuicao],
        ),
      );
    } catch (erro) {
      this.logger.error(
        `Não foi possível marcar a contribuição ${idContribuicao} como 'erro'; ela segue 'pendente'.`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }
  }

  // O texto do erro do provedor NUNCA vai para o usuário (pode trazer detalhe interno do gateway); vai para o log.
  private traduzirErroDoGateway(
    erro: unknown,
    idContribuicao: number,
  ): HttpException {
    if (erro instanceof GatewayPagamentoErro) {
      this.logger.warn(
        `Gateway recusou/falhou ao criar cobrança da contribuição ${idContribuicao}: ${erro.codigo} - ${erro.message}`,
      );
      if (erro.codigo === 'NAO_CONFIGURADO') {
        return new ServiceUnavailableException(MENSAGEM_PAGAMENTO_INDISPONIVEL);
      }
      if (erro.recuperavel) {
        return new ServiceUnavailableException(MENSAGEM_COBRANCA_FALHOU);
      }
      if (erro.codigo === 'RECUSADO') {
        return new UnprocessableEntityException(MENSAGEM_COBRANCA_RECUSADA);
      }
    } else {
      this.logger.error(
        `Erro inesperado ao criar cobrança da contribuição ${idContribuicao}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }
    return new BadGatewayException(MENSAGEM_COBRANCA_FALHOU);
  }
}
