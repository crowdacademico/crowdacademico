import { Injectable, NotFoundException } from '@nestjs/common';
import { ArquivoServiceResolverAvatar } from '../../25-arquivo/service/arquivo.service.resolver-avatar';
import { DatabaseService } from '../../commons/database/database.service';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioResponse } from '../dto/response/usuario.response';

@Injectable()
export class UsuarioServiceFindOne {
  constructor(
    private readonly database: DatabaseService,
    private readonly resolverAvatar: ArquivoServiceResolverAvatar,
  ) {}

  async executar(idUsuario: number): Promise<UsuarioResponse> {
    const usuario = await this.database
      .getDb()
      .selectFrom('usuario')
      .select(USUARIO_COLUNAS_SELECT)
      .where('id_usuario', '=', idUsuario)
      .where('deletado', '=', false)
      .executeTakeFirst();

    if (!usuario) {
      throw new NotFoundException(`Usuário ${idUsuario} não encontrado`);
    }

    // Resolvido aqui (busca de UM usuário só, nunca em findall/listagem): cobre GET /usuario/:id e
    // login/refresh (AuthServiceLogin/Refresh chamam este mesmo service), para o cabeçalho/Minha Conta saberem
    // a foto sem esperar outra requisição.
    const avatar = await this.resolverAvatar.executar(usuario.id_imagem_perfil);

    return {
      ...UsuarioConverter.paraResponseDto(usuario),
      avatarUrl: avatar.url,
    };
  }
}
