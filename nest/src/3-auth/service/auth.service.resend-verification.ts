import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { AuthServiceEmailVerification } from './auth.service.email-verification';

const PERMISSAO = 'verificacao_email_reenviar';

// Suporte reenvia o e-mail de confirmar a conta de outra pessoa (o link sumiu, venceu, caiu no spam). O código antigo
// não dá para reenviar (o banco guarda só o hash), então sai um link novo, e os links ainda não usados da conta deixam
// de valer: só o último e-mail confirma. Conta já confirmada ou excluída não recebe.
@Injectable()
export class AuthServiceResendVerification {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
    private readonly verificacaoEmail: AuthServiceEmailVerification,
  ) {}

  async executar(idUsuario: number): Promise<void> {
    await this.autorizacao.exigirPermissao(
      PERMISSAO,
      'Sem permissão para reenviar o e-mail de verificação.',
    );
    const db = this.database.getDb();
    const usuario = await db
      .selectFrom('usuario')
      .select(['email_verificado', 'deletado'])
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();
    if (!usuario || usuario.deletado) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (usuario.email_verificado) {
      throw new ConflictException('Este e-mail já foi confirmado.');
    }
    await db
      .deleteFrom('verificacao_email')
      .where('id_usuario', '=', idUsuario)
      .where('confirmado_em', 'is', null)
      .execute();
    await this.verificacaoEmail.emitir(idUsuario);
  }
}
