import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { LoginHistoricoResponseDto } from '../dto/response/login-historico.response.dto';

@Injectable()
export class UsuarioServiceListarLogins {
  constructor(private readonly database: DatabaseService) {}

  // Mais recente primeiro — o próprio front decide o que fazer com o 1º
  // item (consultar-usuario.jsx já mostra ele separado, vindo de
  // usuario.ultimo_login_em; esta lista existe pro "resto" do histórico).
  async executar(idUsuario: number): Promise<LoginHistoricoResponseDto[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('sessao')
      .select(['criado_em'])
      .where('id_usuario', '=', idUsuario)
      .orderBy('criado_em', 'desc')
      .execute();

    return linhas.map((linha) => ({ logadoEm: linha.criado_em }));
  }
}
