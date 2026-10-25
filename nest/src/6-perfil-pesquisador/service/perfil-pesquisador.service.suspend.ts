import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { SuspensaoResponseDto } from '../../commons/moderacao/dto/suspensao.response.dto';

// suspender_pesquisador() (03_funcoes_seguranca.sql, [03-P]): dá ao Admin poder completo sobre o pesquisador na
// Bancada. Idempotente por design (a própria função devolve FALSE sem fazer nada se já estava suspenso): nenhum
// erro é levantado nesse caso, só as recusas (sem permissão 92014 = 403, motivo vazio 90020 = 400), traduzidas
// pelo filtro global.
//
// Aceita ate/motivo (mesmo padrão de UsuarioServiceSuspend) e tem buscarSuspensao(), espelhando
// UsuarioServiceSuspend.buscarSuspensao.
@Injectable()
export class PerfilPesquisadorServiceSuspend {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async buscarSuspensao(idUsuario: number): Promise<SuspensaoResponseDto> {
    await this.autorizacao.exigirProprioOuPermissao(
      idUsuario,
      'usuario_suspender',
      'Você só pode ver a suspensão do seu próprio perfil.',
    );
    const linha = await this.database
      .getDb()
      .selectFrom('perfil_pesquisador')
      .select(['suspenso_ate', 'motivo_suspensao', 'suspenso_por'])
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();

    return {
      suspensoAte: linha?.suspenso_ate ?? null,
      motivoSuspensao: linha?.motivo_suspensao ?? null,
      suspensoPor: linha?.suspenso_por ?? null,
    };
  }

  async executar(
    idUsuario: number,
    ate: string,
    motivo: string,
  ): Promise<void> {
    await sql`SELECT public.suspender_pesquisador(${idUsuario}, ${ate}::timestamptz, ${motivo})`.execute(
      this.database.getDb(),
    );
  }
}
