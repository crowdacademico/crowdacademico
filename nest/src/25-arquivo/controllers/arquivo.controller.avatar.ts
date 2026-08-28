import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ArquivoServiceResolverAvatar } from '../service/arquivo.service.resolver-avatar';

// Pública (sem RequireAuthGuard) de propósito — foto de perfil é conteúdo
// público por natureza (ver doc de arquitetura: "nenhum arquivo de vocês
// é secreto"), um visitante anônimo olhando o perfil de um pesquisador ou
// os comentários de uma campanha precisa conseguir ver o avatar sem estar
// logado.
@Controller('arquivo/avatar')
export class ArquivoControllerAvatar {
  constructor(
    private readonly database: DatabaseService,
    private readonly resolver: ArquivoServiceResolverAvatar,
  ) {}

  @Get(':idUsuario')
  async buscar(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    const usuario = await this.database
      .getDb()
      .selectFrom('usuario')
      .select('id_imagem_perfil')
      .where('id_usuario', '=', idUsuario)
      .where('deletado', '=', false)
      .executeTakeFirst();

    if (!usuario) {
      throw new NotFoundException(`Usuário ${idUsuario} não encontrado`);
    }

    return this.resolver.executar(usuario.id_imagem_perfil);
  }
}
