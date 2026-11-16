import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import {
  COBRANCA_GATEWAY,
  type CobrancaGatewayPort,
} from '../../23-pagamento/ports/cobranca-gateway.port';
import {
  ENVIO_EMAIL,
  type EnvioEmailPort,
} from '../../4-mail/ports/envio-email.port';
import type {
  DashboardResponseHealth,
  VerificacaoServicoExterno,
} from '../dto/response/dashboard.response-health';

// Limite de cada verificação: o provedor lento não pode prender a tela (nem a conexão do banco desta requisição).
const LIMITE_MS = 10_000;

type Medido<T> =
  { ok: true; valor: T; ms: number } | { ok: false; erro: string; ms: number };

async function medir<T>(acao: () => Promise<T>): Promise<Medido<T>> {
  const inicio = Date.now();
  let relogio: NodeJS.Timeout | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    relogio = setTimeout(
      () => rejeitar(new Error(`Sem resposta em ${LIMITE_MS / 1000} s.`)),
      LIMITE_MS,
    );
  });
  try {
    const valor = await Promise.race([acao(), limite]);
    return { ok: true, valor, ms: Date.now() - inicio };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : String(erro),
      ms: Date.now() - inicio,
    };
  } finally {
    clearTimeout(relogio);
  }
}

// Aba Saúde do Dashboard (16-11-2026, pedido do Lucas): além do banco (GET /health), confere AGORA o provedor de
// pagamento e o de e-mail, pelas portas (cada adapter sabe como falar com o seu, sem cobrar nem enviar nada).
// Permissão: relatorio_visualizar (a mesma do Dashboard).
@Injectable()
export class DashboardServiceHealth {
  constructor(
    private readonly database: DatabaseService,
    @Inject(COBRANCA_GATEWAY) private readonly gateway: CobrancaGatewayPort,
    @Inject(ENVIO_EMAIL) private readonly email: EnvioEmailPort,
  ) {}

  async executar(): Promise<DashboardResponseHealth> {
    const db = this.database.getDb();
    const pode = await sql<{
      pode: boolean;
    }>`SELECT public.tem_permissao('relatorio_visualizar') AS pode`.execute(db);
    if (!pode.rows[0]?.pode) {
      throw new ForbiddenException(
        'Só quem vê os relatórios do sistema vê a saúde dele.',
      );
    }

    const [pagamento, email] = await Promise.all([
      medir(() => this.gateway.verificarConexao()),
      medir(() => this.email.verificarConexao()),
    ]);

    // A tela escreve o "Conectado"; a mensagem só carrega texto quando falha (o motivo que o provedor deu).
    const comoServico = (m: Medido<unknown>): VerificacaoServicoExterno =>
      m.ok
        ? { ok: true, mensagem: '', ms: m.ms }
        : { ok: false, mensagem: m.erro, ms: m.ms };

    return {
      pagamento: {
        ...comoServico(pagamento),
        provedor: this.gateway.provedor,
        ambiente: pagamento.ok ? pagamento.valor.ambiente : null,
        saldo: pagamento.ok ? pagamento.valor.saldo : null,
      },
      email: {
        ...comoServico(email),
        provedor: this.email.provedor,
        redirecionado: this.email.redirecionado === true,
      },
      verificadoEm: new Date().toISOString(),
    };
  }
}
