import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';

@Injectable()
export class UsuarioServiceRemove {
  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async executar(idUsuario: number): Promise<void> {
    const db = this.database.getDb();

    // Capturado ANTES de chamar a função — depois que ela roda,
    // usuario.deletado vira TRUE, e pol_usuario_select (04_rls_policies.sql)
    // só deixa enxergar linhas com deletado=FALSE pra quem não tiver a
    // permissão 'usuario_visualizar_sensivel'. No caso mais comum (a
    // própria pessoa excluindo a própria conta, sem nenhuma permissão
    // especial), ler DEPOIS voltaria vazio — silenciosamente pulando a
    // limpeza. Antes da exclusão, a linha está sempre visível (a condição
    // `deletado = FALSE` da policy já basta, não importa quem pergunta).
    const usuarioAntes = await db
      .selectFrom('usuario')
      .select('id_imagem_perfil')
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();

    // Não existe DELETE de verdade em `usuario` — nem GRANT, nem policy
    // (soft delete de propósito, ver DOCUMENTACAO_BD.md, [03-O]). O único
    // caminho é a função excluir_conta_usuario(), que exige
    // p_id_usuario = id_usuario_atual() OU a permissão 'usuario_excluir'.
    // Controller aplica RequireAuthGuard (3-auth) — sem login, nem chega aqui.
    try {
      await sql`SELECT public.excluir_conta_usuario(${idUsuario})`.execute(db);
    } catch (erro) {
      throw new ForbiddenException(
        (erro as Error).message || 'Sem permissão para excluir esta conta.',
      );
    }

    // ADICIONADO (módulo 25-arquivo): a função SQL já desativa
    // (ativo=false) a linha de `arquivo` vinculada como foto de perfil, na
    // MESMA transação da exclusão da conta (ver 03_funcoes_seguranca.sql)
    // — isso cobre a parte de CONSISTÊNCIA DE DADOS, garantida não importa
    // quem chamou. O que falta é só o lado que o Postgres não alcança: os
    // bytes de verdade no bucket.
    if (usuarioAntes?.id_imagem_perfil) {
      const arquivo = await db
        .selectFrom('arquivo')
        .select('chave')
        .where('id_arquivo', '=', usuarioAntes.id_imagem_perfil)
        .executeTakeFirst();

      if (arquivo) {
        // Best-effort — a conta já foi excluída com sucesso nesse ponto;
        // uma falha aqui (ex.: bucket temporariamente fora do ar) não pode
        // reverter isso nem ser reportada como falha da exclusão em si.
        // Pior caso: o objeto fica órfão no bucket, mesma categoria de
        // baixo risco/baixa prioridade já aceita em outros pontos deste
        // módulo.
        await this.armazenamento.excluirObjeto(arquivo.chave).catch(() => undefined);
      }
    }
  }
}