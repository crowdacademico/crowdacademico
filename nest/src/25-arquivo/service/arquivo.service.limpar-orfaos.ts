import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';

// Arquivo enviado que nenhum dono adotou (não virou foto de perfil nem anexo) dentro de
// `configuracoes.arquivo_horas_para_vincular` (24h; 0 = desligado). Quem decide o que é órfão é a função SQL
// `desativar_arquivos_orfaos()` (SECURITY DEFINER, 05 [05-G]), que desativa as linhas e devolve as chaves; aqui
// só agenda e apaga os objetos do armazenamento. Mesma ordem de ArquivoServiceRemove: banco primeiro (a linha
// inativa já some do sistema), armazenamento depois; falha ao apagar o objeto só é logada.
//
// Mesmo molde dos outros jobs (`PG_POOL` direto, porque o job roda fora do pipeline HTTP e sem sessão de usuário).
@Injectable()
export class ArquivoServiceLimparOrfaos {
  private readonly logger = new Logger(ArquivoServiceLimparOrfaos.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  // 1x por dia, de madrugada, uma hora depois da limpeza do log (03h).
  @Cron('0 4 * * *')
  async executar(): Promise<void> {
    // try/catch: sem ele, uma exceção vira unhandledRejection e derruba o processo por causa de um job de limpeza.
    try {
      const resultado = await this.pool.query<{
        id_arquivo: number;
        chave: string;
      }>('SELECT id_arquivo, chave FROM public.desativar_arquivos_orfaos()');
      for (const { id_arquivo, chave } of resultado.rows) {
        await this.armazenamento.excluirObjeto(chave).catch((erro) => {
          this.logger.warn(
            `Falha ao apagar objeto órfão do armazenamento (arquivo=${id_arquivo}, chave=${chave}): ${(erro as Error).message}`,
          );
        });
      }
      if (resultado.rows.length > 0) {
        this.logger.log(
          `${resultado.rows.length} arquivo(s) sem dono desativado(s) e apagado(s) do armazenamento.`,
        );
      }
    } catch (erro) {
      this.logger.error(
        `Falha ao limpar arquivos órfãos: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }
}
