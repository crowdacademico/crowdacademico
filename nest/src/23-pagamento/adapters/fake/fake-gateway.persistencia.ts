import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../commons/database/database.constants';
import { FakeGatewayAdapter, type EstadoFake } from './fake-gateway.adapter';

// Arquivo local (fora do git) onde o provedor de teste guarda o que sabe. Fica na pasta de onde o Nest foi iniciado
// (nest/, com npm run start:dev ou start:dev:teste).
export const ARQUIVO_ESTADO_FAKE = '.fake-gateway.json';

interface ArquivoFake {
  // Qual banco o estado conhece: o número interno da tabela contribuicao no Postgres, que muda quando o banco é
  // recriado. Carimbo diferente = banco novo, e o arquivo é ignorado (as cobranças antigas não existem nele).
  carimbo: string;
  estado: EstadoFake;
}

// O provedor de teste (PAYMENT_PROVIDER=fake) guarda as cobranças na memória do Nest. Esta peça grava cada mudança num
// arquivo e lê de volta quando o Nest sobe: reiniciar (Ctrl+C, ou o --watch ao salvar um arquivo) não deixa mais as
// cobranças da T5 "perdidas". Com qualquer outro provedor, não faz nada. Falhar aqui nunca impede o Nest de subir.
@Injectable()
export class FakeGatewayPersistencia implements OnModuleInit {
  private readonly logger = new Logger(FakeGatewayPersistencia.name);

  constructor(
    // Mesmo valor de ADAPTER_PAGAMENTO; importar o pagamento.module daqui seria um ciclo (o token chegaria indefinido).
    @Inject('ADAPTER_PAGAMENTO') private readonly adapter: unknown,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  async onModuleInit(): Promise<void> {
    const fake = this.adapter;
    if (!(fake instanceof FakeGatewayAdapter)) return;
    const arquivo = join(process.cwd(), ARQUIVO_ESTADO_FAKE);
    let carimbo: string;
    try {
      const resultado = await this.pool.query<{ carimbo: string }>(
        "SELECT current_database() || ':' || 'public.contribuicao'::regclass::oid AS carimbo",
      );
      carimbo = resultado.rows[0].carimbo;
    } catch (erro) {
      this.logger.warn(
        `Provedor de teste sem memória em arquivo (não li o banco): ${erro instanceof Error ? erro.message : String(erro)}`,
      );
      return;
    }

    this.recuperar(fake, arquivo, carimbo);
    fake.aoMudar(() => this.salvar(fake, arquivo, carimbo));
  }

  private recuperar(
    fake: FakeGatewayAdapter,
    arquivo: string,
    carimbo: string,
  ): void {
    if (!existsSync(arquivo)) return;
    try {
      const salvo = JSON.parse(readFileSync(arquivo, 'utf8')) as ArquivoFake;
      if (salvo.carimbo !== carimbo) {
        this.logger.log(
          'Provedor de teste: o banco foi recriado, as cobranças guardadas eram do banco anterior e foram descartadas.',
        );
        return;
      }
      fake.importarEstado(salvo.estado);
      this.logger.log(
        `Provedor de teste: ${fake.quantidadeCobrancas} cobrança(s) recuperada(s) de ${ARQUIVO_ESTADO_FAKE}.`,
      );
    } catch (erro) {
      this.logger.warn(
        `Provedor de teste: não consegui ler ${ARQUIVO_ESTADO_FAKE} (começa vazio): ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }

  // Grava num arquivo temporário e troca de nome: um Ctrl+C no meio da gravação nunca deixa o arquivo pela metade.
  private salvar(
    fake: FakeGatewayAdapter,
    arquivo: string,
    carimbo: string,
  ): void {
    try {
      const conteudo: ArquivoFake = { carimbo, estado: fake.exportarEstado() };
      writeFileSync(`${arquivo}.tmp`, JSON.stringify(conteudo));
      renameSync(`${arquivo}.tmp`, arquivo);
    } catch (erro) {
      this.logger.warn(
        `Provedor de teste: não consegui gravar ${ARQUIVO_ESTADO_FAKE}: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }
}
