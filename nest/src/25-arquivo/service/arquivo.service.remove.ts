import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';

@Injectable()
export class ArquivoServiceRemove {
  private readonly logger = new Logger(ArquivoServiceRemove.name);

  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  // Soft delete no BANCO (ativo=false), nunca DELETE de verdade na linha —
  // 06_grants.sql só concede INSERT/UPDATE em `arquivo` (sem DELETE), e faz
  // sentido: um arquivo referenciado por arquivo_atualizacao/
  // arquivo_recompensa/usuario.id_imagem_perfil não pode simplesmente
  // sumir do banco (quebraria FK). A linha fica, só marcada inativa — e é
  // por isso que ArquivoServiceResolverAvatar e qualquer outro lugar que
  // exibe arquivo já filtram por `ativo=true` antes de mostrar.
  //
  // ADICIONADO: agora TAMBÉM apaga o objeto de verdade no bucket
  // (armazenamento.excluirObjeto) — antes só desativava no banco e o
  // arquivo ficava esquecido lá pra sempre, ocupando espaço sem nenhuma
  // referência ativa apontando pra ele. Isso é seguro fazer aqui porque
  // ninguém serve o arquivo pela CHAVE direto do bucket sem passar antes
  // pela checagem de `ativo` no banco — uma vez `ativo=false`, o dado já
  // parou de aparecer em qualquer lugar do sistema, então apagar os bytes
  // não quebra nada que ainda devesse funcionar. Falha ao apagar do bucket
  // NÃO desfaz o soft delete (a linha já ficou inativa, que é o que
  // importa pra correção do sistema) — só vira um objeto órfão no bucket,
  // mesma categoria de baixo risco/baixa prioridade dos uploads
  // abandonados em pendente/.
  async executar(idArquivo: number): Promise<void> {
    const db = this.database.getDb();

    const linha = await db
      .updateTable('arquivo')
      .set({ ativo: false, desativado_em: new Date() })
      .where('id_arquivo', '=', idArquivo)
      .where('ativo', '=', true)
      .returning(['id_arquivo', 'chave'])
      .executeTakeFirst();

    if (linha) {
      // LOGADO, não mais engolido em silêncio (25-08-2026, achado do
      // Lucas: objeto órfão sobrou no bucket sem nenhum rastro do motivo).
      await this.armazenamento.excluirObjeto(linha.chave).catch((erro) => {
        this.logger.warn(
          `Falha ao apagar objeto do bucket (arquivo=${idArquivo}, chave=${linha.chave}): ${(erro as Error).message}`,
        );
      });
      return;
    }

    // 0 linhas afetadas: três causas possíveis, só uma delas é erro de
    // verdade. SELECT é USING(TRUE) (pol_arquivo_select), então sempre
    // enxerga a linha se ela existir — usamos isso pra diferenciar.
    const atual = await db
      .selectFrom('arquivo')
      .select('ativo')
      .where('id_arquivo', '=', idArquivo)
      .executeTakeFirst();

    if (!atual) {
      throw new NotFoundException(`Arquivo ${idArquivo} não encontrado`);
    }
    if (!atual.ativo) {
      // Já estava inativo — idempotente, não é erro repetir a remoção. Os
      // bytes no bucket já devem ter sido apagados na primeira vez (ou
      // nunca existiram, se o arquivo já tinha sido desativado antes desta
      // mudança) — não tenta apagar de novo.
      return;
    }
    // Existe e está ativo, mas o UPDATE não pegou: pol_arquivo_update (04)
    // bloqueou por falta de posse (dono do perfil/atualização/recompensa)
    // ou da permissão 'arquivo_gerenciar'.
    throw new ForbiddenException('Sem permissão para remover este arquivo.');
  }
}
