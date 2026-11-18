import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { COMENTARIO_COLUNAS_SELECT } from '../constants/comentario.constants';
import { ComentarioConverter } from '../dto/converter/comentario.converter';
import { ComentarioModeracaoResponse } from '../dto/response/comentario.response';

// Os comentários de todas as campanhas, o mais novo primeiro: a tela Comentários da moderação (18-11-2026). Não é um
// mural: o comentário é de pesquisador para pesquisador e só o endossado fica público. A tela existe para o caso
// excepcional (um comentário perigoso) que ninguém denunciou. Como a lista de atualizações, sem 403:
// pol_comentario_select (04) mostra tudo a quem tem comentario_moderar e, aos outros, só o que já veriam.
@Injectable()
export class ComentarioServiceFindAllModeracao {
  constructor(private readonly database: DatabaseService) {}

  async executar(limite = 500): Promise<ComentarioModeracaoResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('comentario')
      .leftJoin('campanha', 'campanha.id_campanha', 'comentario.id_campanha')
      .leftJoin('usuario', 'usuario.id_usuario', 'comentario.id_pesquisador')
      .select(
        COMENTARIO_COLUNAS_SELECT.map(
          (coluna) => `comentario.${coluna}` as const,
        ),
      )
      .select([
        'usuario.nome as nome_pesquisador',
        'campanha.titulo as titulo_campanha',
      ])
      .orderBy('comentario.criado_em', 'desc')
      .orderBy('comentario.id_comentario', 'desc')
      .limit(limite)
      .execute();
    return linhas.map((linha) => ({
      ...ComentarioConverter.paraResponseDto(linha),
      tituloCampanha: linha.titulo_campanha,
    }));
  }
}
