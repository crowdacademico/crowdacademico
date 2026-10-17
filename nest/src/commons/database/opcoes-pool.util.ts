import { ConfigService } from '@nestjs/config';
import { Pool, PoolConfig } from 'pg';

// Limites EXPLÍCITOS do Pool. Antes só `connectionString` era passado, e o `pg` fica com o padrão dele: máximo de 10
// clients (que já era o limite de fato) e, o ponto perigoso, `connectionTimeoutMillis: 0` = esperar por um client
// para SEMPRE. Pool esgotado virava requisição pendurada sem erro, em vez de falha rápida e visível.
//
//  - max: quantos clients simultâneos. Mantido em 10 (o mesmo de antes). Lembre que cada requisição comum prende UM
//    por inteiro (GlobalDbInterceptor): este número é, na prática, o teto de requisições com banco em andamento.
//    Conferir contra o limite de conexões do pooler do provedor antes de subir.
//  - idleTimeoutMillis: fecha o client ocioso depois deste tempo.
//  - connectionTimeoutMillis: quanto uma requisição espera por um client livre antes de falhar. 10s: esperar mais
//    que isso é pior que dar erro.
export const OPCOES_POOL_PADRAO = {
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
} as const;

type LeitorConfig = Pick<ConfigService, 'get'>;

function lerInteiroPositivo(
  config: LeitorConfig,
  nomeVariavel: string,
  padrao: number,
): number {
  const bruto = config.get<string | number>(nomeVariavel);
  if (bruto === undefined || bruto === '') return padrao;

  const valor = Number(bruto);
  if (!Number.isInteger(valor) || valor <= 0) {
    // Falha no boot, não valor "corrigido" em silêncio: pool com limite diferente do que a pessoa escreveu é
    // exatamente o tipo de coisa que só aparece em produção.
    throw new Error(
      `${nomeVariavel} inválida: "${String(bruto)}". Use um número inteiro maior que zero (ou remova a variável para usar ${padrao}).`,
    );
  }
  return valor;
}

export function lerOpcoesPool(
  config: LeitorConfig,
): Required<
  Pick<PoolConfig, 'max' | 'idleTimeoutMillis' | 'connectionTimeoutMillis'>
> {
  return {
    max: lerInteiroPositivo(config, 'DB_POOL_MAX', OPCOES_POOL_PADRAO.max),
    idleTimeoutMillis: lerInteiroPositivo(
      config,
      'DB_POOL_IDLE_TIMEOUT_MS',
      OPCOES_POOL_PADRAO.idleTimeoutMillis,
    ),
    connectionTimeoutMillis: lerInteiroPositivo(
      config,
      'DB_POOL_CONNECTION_TIMEOUT_MS',
      OPCOES_POOL_PADRAO.connectionTimeoutMillis,
    ),
  };
}

export function criarPool(config: LeitorConfig): Pool {
  return new Pool({
    connectionString: config.get<string>('DATABASE_URL'),
    ...lerOpcoesPool(config),
  });
}
