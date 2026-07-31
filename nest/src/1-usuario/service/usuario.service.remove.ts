import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';

@Injectable()
export class UsuarioServiceRemove {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async executar(idUsuario: number): Promise<void> {
    // Não existe DELETE de verdade em `usuario` — nem GRANT, nem policy
    // (soft delete de propósito, ver DOCUMENTACAO_BD.md, [03-F]). O único
    // caminho é a função excluir_conta_usuario(), que exige
    // p_id_usuario = id_usuario_atual() OU a permissão 'usuario_excluir'.
    //
    // OBSERVAÇÃO (vai mudar assim que o módulo 23-auth existir): sem
    // SET LOCAL app.id_usuario_atual, id_usuario_atual() é sempre NULL — ou
    // seja, esta chamada SEMPRE vai cair no RAISE EXCEPTION da função,
    // nunca vai excluir ninguém enquanto não houver sessão de verdade.
    // Isso é o comportamento correto (ver 5ª/6ª auditoria em PENDENCIAS),
    // não um bug deste service.
    try {
      await this.pool.query('SELECT public.excluir_conta_usuario($1)', [
        idUsuario,
      ]);
    } catch (erro) {
      throw new ForbiddenException(
        (erro as Error).message ||
          'Sem permissão para excluir esta conta (sem sessão autenticada ainda).',
      );
    }
  }
}
