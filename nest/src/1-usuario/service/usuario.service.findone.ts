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

    // ADICIONADO (25-08-2026, módulo 25-arquivo): resolvido aqui (busca de
    // UM usuário só, nunca em findall/listagem) - cobre tanto GET /usuario/
    // :id (consultar-usuario.jsx, que hoje ainda busca separado, sem
    // problema, só redundante) quanto login/refresh (AuthServiceLogin/
    // Refresh chamam este mesmo service), que é o que faltava pro
    // cabeçalho/Minha Conta saberem a foto sem esperar outra requisição.
    const avatar = await this.resolverAvatar.executar(usuario.id_imagem_perfil);

    return { ...UsuarioConverter.paraResponseDto(usuario), avatarUrl: avatar.url };
  }
}
