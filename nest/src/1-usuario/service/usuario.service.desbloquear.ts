import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class UsuarioServiceDesbloquear {
  constructor(private readonly database: DatabaseService) {}

  // liberar_bloqueio_login() (03_funcoes_seguranca.sql, [03-O]) zera
  // tentativas_login_falhas e bloqueado_ate - SECURITY DEFINER, exige a
  // permissão 'usuario_desbloquear' internamente (checagem própria da
  // função, não RLS). A função existia no banco desde sempre, mas nenhum
  // endpoint nunca chamava ela - achado ao investigar "o que falta no
  // painel admin" (03-08-2026, pedido do Lucas): uma conta bloqueada por
  // excesso de tentativas de login não tinha NENHUM jeito de ser
  // desbloqueada pelo painel, só direto no banco.
  async executar(idUsuario: number): Promise<void> {
    try {
      await sql`SELECT public.liberar_bloqueio_login(${idUsuario})`.execute(
        this.database.getDb(),
      );
    } catch (erro) {
      throw new ForbiddenException(
        (erro as Error).message || 'Sem permissão para desbloquear esta conta.',
      );
    }
  }
}
