import { Cron } from '@nestjs/schedule';
import {
  INTERVALO_TAREFA_MINUTOS,
  TAREFA_AUTOMATICA,
  cronACada,
} from '../../commons/agendamento/tarefa-automatica';
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { sql } from 'kysely';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { DatabaseService } from '../../commons/database/database.service';
import { executarTransacaoCurta } from '../../commons/database/transacao-curta.util';
import { decifrarCpf } from '../../commons/seguranca/cpf-cifra.util';
import {
  CABECALHO_TOKEN_FAKE,
  FakeGatewayAdapter,
  TOKEN_WEBHOOK_FAKE_PADRAO,
} from '../../29-pagamento/adapters/fake/fake-gateway.adapter';
import {
  ADAPTER_PAGAMENTO,
  type AdapterPagamento,
} from '../../29-pagamento/pagamento.module';
import { PagamentoServiceReconcile } from '../../29-pagamento/service/pagamento.service.reconcile';
import { PagamentoServiceRefundPending } from '../../29-pagamento/service/pagamento.service.refund-pending';
import { PagamentoServiceTransferPending } from '../../29-pagamento/service/pagamento.service.transfer-pending';
import { PagamentoServiceWebhook } from '../../29-pagamento/service/pagamento.service.webhook';
import { ContaRecebimentoRequestCreate } from '../../30-conta-recebimento/dto/request/conta-recebimento.request-create';
import { ContaRecebimentoResponse } from '../../30-conta-recebimento/dto/response/conta-recebimento.response';
import { ContaRecebimentoServiceCreate } from '../../30-conta-recebimento/service/conta-recebimento.service.create';
import { normalizarChavePix } from '../../30-conta-recebimento/util/chave-pix.util';
import {
  PagamentoBancadaContribuicao,
  PagamentoBancadaEstado,
  PagamentoBancadaRepasse,
} from '../dto/pagamento-bancada.response';

export const TAREFAS_BANCADA = [
  'encerrar',
  'repasse',
  'devolucao',
  'conferir',
  'pagar',
] as const;
export type TarefaBancada = (typeof TAREFAS_BANCADA)[number];

const LIMITE_LINHAS = 30;
// Interruptor do pagamento automático (parâmetro booleano em configuracoes, 07; nasce desligado). Ligado, a cada minuto
// o provedor de teste paga todas as cobranças pendentes, como se quem apoia tivesse pago.
export const CHAVE_PAGAMENTO_AUTOMATICO = 'teste_pagamento_automatico_ligado';
const INTERVALO_PAGAMENTO_AUTOMATICO_MINUTOS = 1;
const MENSAGEM_SO_FAKE =
  'Esta ação só funciona com o provedor de teste (PAYMENT_PROVIDER=fake).';
const MENSAGEM_COBRANCA_PERDIDA =
  'O provedor de teste não conhece esta cobrança: o Nest reiniciou e a memória dele foi apagada.';

interface LinhaContribuicao {
  id_contribuicao: number;
  id_campanha: number;
  titulo: string;
  valor: string;
  taxa_pagamento: string;
  meio_pagamento: string;
  dinheiro_liberado_em: Date | null;
  status: string;
  id_transacao_api: string | null;
  id_repasse: number | null;
  criado_em: Date;
}

interface LinhaRepasse {
  id_repasse: number;
  id_campanha: number;
  titulo: string;
  status: string;
  valor_liquido: string;
  id_transferencia_api: string | null;
  aguardando_conta: boolean;
}

// Bancada de pagamento (T05): faz o papel de quem paga e do provedor, para testar o fluxo do dinheiro pela tela.
// Com o provedor de teste (Fake), liga o aviso que ele emite ao webhook de verdade, dentro do próprio processo:
// pagar um Pix aqui passa pelo mesmo caminho de um aviso real (registrar o evento, reconsultar, aplicar). Rodar
// as tarefas automáticas funciona com qualquer provedor; o resto, só com o Fake.
@Injectable()
export class PagamentoServiceBancada implements OnModuleInit {
  private readonly logger = new Logger(PagamentoServiceBancada.name);
  // Avisos ainda sendo entregues: cada ação espera por eles antes de responder, para a tela já ver o resultado.
  private readonly entregas = new Set<Promise<unknown>>();

  constructor(
    @Inject(ADAPTER_PAGAMENTO) private readonly adapter: AdapterPagamento,
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly database: DatabaseService,
    private readonly webhook: PagamentoServiceWebhook,
    private readonly repasse: PagamentoServiceTransferPending,
    private readonly devolucao: PagamentoServiceRefundPending,
    private readonly conferencia: PagamentoServiceReconcile,
    private readonly contaRecebimento: ContaRecebimentoServiceCreate,
  ) {}

  onModuleInit(): void {
    if (!(this.adapter instanceof FakeGatewayAdapter)) return;
    this.adapter.aoEmitirEvento((payload) => {
      const entrega = this.webhook
        .receber(
          this.adapter.provedor,
          { [CABECALHO_TOKEN_FAKE]: TOKEN_WEBHOOK_FAKE_PADRAO },
          payload,
        )
        .catch((erro: unknown) =>
          this.logger.warn(
            `Aviso ${payload.event} não foi processado: ${erro instanceof Error ? erro.message : String(erro)}`,
          ),
        );
      this.entregas.add(entrega);
      void entrega.finally(() => this.entregas.delete(entrega));
    });
  }

  async estado(): Promise<PagamentoBancadaEstado> {
    const db = this.database.getDb();
    const contribuicoes = await sql<LinhaContribuicao>`
      SELECT c.id_contribuicao, c.id_campanha, ca.titulo, c.valor, c.taxa_pagamento, c.meio_pagamento::text AS meio_pagamento,
             c.dinheiro_liberado_em, c.status::text AS status,
             c.id_transacao_api, c.id_repasse, c.criado_em
      FROM contribuicao c JOIN campanha ca ON ca.id_campanha = c.id_campanha
      ORDER BY c.id_contribuicao DESC
      LIMIT ${LIMITE_LINHAS}`.execute(db);
    const repasses = await sql<LinhaRepasse>`
      SELECT r.id_repasse, r.id_campanha, ca.titulo, r.status::text AS status, r.valor_liquido,
             r.id_transferencia_api,
             NOT EXISTS (SELECT 1 FROM perfil_pesquisador pp
                         WHERE pp.id_usuario = ca.id_usuario AND pp.chave_pix_verificada_em IS NOT NULL) AS aguardando_conta
      FROM repasse r JOIN campanha ca ON ca.id_campanha = r.id_campanha
      ORDER BY r.id_repasse DESC
      LIMIT ${LIMITE_LINHAS}`.execute(db);

    return {
      provedor: this.adapter.provedor,
      provedorDeTeste: this.adapter instanceof FakeGatewayAdapter,
      // De quantos em quantos minutos cada tarefa roda, pela chave do interruptor (o card da T5 mostra).
      intervalosMinutos: {
        ...Object.fromEntries(
          (
            Object.keys(TAREFA_AUTOMATICA) as (keyof typeof TAREFA_AUTOMATICA)[]
          ).map((tarefa) => [
            TAREFA_AUTOMATICA[tarefa],
            INTERVALO_TAREFA_MINUTOS[tarefa],
          ]),
        ),
        [CHAVE_PAGAMENTO_AUTOMATICO]: INTERVALO_PAGAMENTO_AUTOMATICO_MINUTOS,
      },
      contribuicoes: await Promise.all(
        contribuicoes.rows.map((linha) => this.paraContribuicao(linha)),
      ),
      repasses: await Promise.all(
        repasses.rows.map((linha) => this.paraRepasse(linha)),
      ),
    };
  }

  // Paga, como quem apoia, todas as cobranças que o provedor de teste tem pendentes, pelo mesmo caminho do botão Pagar
  // (o aviso passa pelo webhook de verdade). Devolve quantas pagou.
  async pagarPendentes(): Promise<number> {
    const fake = this.fake();
    const pendentes = fake.cobrancasPendentes();
    pendentes.forEach((idCobranca) => fake.confirmarCobranca(idCobranca));
    await this.esperarAvisos();
    return pendentes.length;
  }

  // Pagamento automático (só com o provedor de teste e com o interruptor ligado). O Campo de Testes não existe em
  // produção, então esta tarefa também não. try/catch pelo mesmo motivo dos outros crons (exceção solta derruba o processo).
  @Cron(cronACada(INTERVALO_PAGAMENTO_AUTOMATICO_MINUTOS))
  async pagamentoAutomatico(): Promise<void> {
    if (!(this.adapter instanceof FakeGatewayAdapter)) return;
    try {
      const resultado = await this.pool.query<{ ligado: boolean }>(
        'SELECT public.config_booleano($1::text, FALSE) AS ligado',
        [CHAVE_PAGAMENTO_AUTOMATICO],
      );
      if (resultado.rows[0]?.ligado !== true) return;
      const pagas = await this.pagarPendentes();
      if (pagas > 0) {
        this.logger.log(
          `Pagamento automático (Campo de Testes): ${pagas} cobrança(s) paga(s).`,
        );
      }
    } catch (erro) {
      this.logger.warn(
        `Pagamento automático falhou: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }

  async pagar(idContribuicao: number): Promise<void> {
    const fake = this.fake();
    const idCobranca = await this.idCobranca(idContribuicao);
    this.semPerderCobranca(() => fake.confirmarCobranca(idCobranca));
    await this.esperarAvisos();
  }

  async vencer(idContribuicao: number): Promise<void> {
    const fake = this.fake();
    const idCobranca = await this.idCobranca(idContribuicao);
    this.semPerderCobranca(() => fake.expirarCobranca(idCobranca));
    await this.esperarAvisos();
  }

  // Cartão: o provedor libera o dinheiro (no Asaas, cerca de 30 dias depois do pagamento).
  async liberar(idContribuicao: number): Promise<void> {
    const fake = this.fake();
    const idCobranca = await this.idCobranca(idContribuicao);
    this.semPerderCobranca(() => fake.liberarCobranca(idCobranca));
    await this.esperarAvisos();
  }

  // Reenvia o último aviso desta cobrança, como o provedor faz quando não recebe a resposta a tempo.
  async repetirAviso(idContribuicao: number): Promise<void> {
    const fake = this.fake();
    const idCobranca = await this.idCobranca(idContribuicao);
    const ultimo = fake.eventosEmitidos.findLast(
      (evento) => evento.payment?.id === idCobranca,
    );
    if (!ultimo) {
      throw new ConflictException(
        'O provedor de teste ainda não mandou nenhum aviso desta cobrança.',
      );
    }
    fake.reenviarEvento(ultimo.id);
    await this.esperarAvisos();
  }

  async concluirTransferencia(
    idRepasse: number,
    falhou: boolean,
  ): Promise<void> {
    const fake = this.fake();
    const resultado = await sql<{ id_transferencia_api: string | null }>`
      SELECT id_transferencia_api FROM repasse WHERE id_repasse = ${idRepasse}`.execute(
      this.database.getDb(),
    );
    const idTransferencia = resultado.rows[0]?.id_transferencia_api;
    if (!idTransferencia) {
      throw new ConflictException(
        'Este repasse ainda não pediu transferência ao provedor (rode o repasse antes).',
      );
    }
    this.semPerderCobranca(() =>
      fake.concluirTransferencia(idTransferencia, falhou),
    );
    await this.esperarAvisos();
  }

  async rodar(tarefa: TarefaBancada): Promise<void> {
    switch (tarefa) {
      case 'encerrar':
        await this.pool.query(
          'SELECT public.expirar_contribuicoes_pendentes()',
        );
        await this.pool.query('SELECT public.encerrar_campanhas_vencidas()');
        break;
      case 'repasse':
        await this.repasse.executar();
        break;
      case 'devolucao':
        await this.devolucao.executar();
        break;
      case 'pagar':
        await this.pagarPendentes();
        break;
      default:
        await this.conferencia.executar();
    }
    await this.esperarAvisos();
  }

  // Cadastra a chave Pix da conta logada pela rota de verdade (POST /conta-recebimento). Antes, registra a chave no
  // "diretório Pix" do provedor de teste com o CPF do próprio perfil, para a titularidade ser confirmada.
  async cadastrarChavePix(
    dto: ContaRecebimentoRequestCreate,
    idUsuario: number,
  ): Promise<ContaRecebimentoResponse | null> {
    const fake = this.fake();
    const cifrado = await executarTransacaoCurta(
      this.pool,
      { idUsuario },
      async (client) =>
        (
          await client.query<{ cpf_criptografado: string }>(
            'SELECT cpf_criptografado FROM perfil_pesquisador WHERE id_usuario = $1',
            [idUsuario],
          )
        ).rows.at(0)?.cpf_criptografado,
    );
    if (cifrado) {
      fake.registrarChavePix(
        normalizarChavePix(dto.tipoChave, dto.chave),
        decifrarCpf(cifrado),
      );
    }
    return this.contaRecebimento.executar(dto, idUsuario);
  }

  private fake(): FakeGatewayAdapter {
    if (!(this.adapter instanceof FakeGatewayAdapter)) {
      throw new ConflictException(MENSAGEM_SO_FAKE);
    }
    return this.adapter;
  }

  private async idCobranca(idContribuicao: number): Promise<string> {
    const resultado = await sql<{ id_transacao_api: string | null }>`
      SELECT id_transacao_api FROM contribuicao WHERE id_contribuicao = ${idContribuicao}`.execute(
      this.database.getDb(),
    );
    const linha = resultado.rows.at(0);
    if (!linha) {
      throw new NotFoundException('Contribuição não encontrada.');
    }
    if (!linha.id_transacao_api) {
      throw new ConflictException(
        'Esta contribuição não tem cobrança no provedor.',
      );
    }
    return linha.id_transacao_api;
  }

  private semPerderCobranca(acao: () => void): void {
    try {
      acao();
    } catch {
      throw new ConflictException(MENSAGEM_COBRANCA_PERDIDA);
    }
  }

  private async esperarAvisos(): Promise<void> {
    while (this.entregas.size > 0) {
      await Promise.all([...this.entregas]);
    }
  }

  private async paraContribuicao(
    linha: LinhaContribuicao,
  ): Promise<PagamentoBancadaContribuicao> {
    return {
      idContribuicao: linha.id_contribuicao,
      idCampanha: linha.id_campanha,
      tituloCampanha: linha.titulo,
      valor: Number(linha.valor),
      taxaPagamento: Number(linha.taxa_pagamento),
      meioPagamento: linha.meio_pagamento,
      // Pix: disponível ao pagar. Cartão: só quando o provedor libera.
      dinheiroLiberado:
        linha.meio_pagamento === 'pix' || linha.dinheiro_liberado_em !== null,
      status: linha.status,
      idRepasse: linha.id_repasse,
      criadoEm: linha.criado_em,
      noProvedor: await this.statusNoProvedor(linha.id_transacao_api, (id) =>
        this.adapter.consultarCobranca(id),
      ),
    };
  }

  private async paraRepasse(
    linha: LinhaRepasse,
  ): Promise<PagamentoBancadaRepasse> {
    return {
      idRepasse: linha.id_repasse,
      idCampanha: linha.id_campanha,
      tituloCampanha: linha.titulo,
      status: linha.status,
      valorLiquido: Number(linha.valor_liquido),
      aguardandoConta: linha.aguardando_conta,
      noProvedor: await this.statusNoProvedor(
        linha.id_transferencia_api,
        (id) => this.adapter.consultarTransferencia(id),
      ),
    };
  }

  // O que o provedor diz desta cobrança/transferência. Só pergunta ao Fake (é memória, sem rede): com um provedor
  // real a lista não faria uma chamada externa por linha.
  private async statusNoProvedor(
    id: string | null,
    consultar: (id: string) => Promise<{ status: string }>,
  ): Promise<string | null> {
    if (!id || !(this.adapter instanceof FakeGatewayAdapter)) return null;
    try {
      return (await consultar(id)).status;
    } catch {
      return 'perdida';
    }
  }
}
