import { Controller, Get, Query } from '@nestjs/common';
import { PagamentoRevisaoRequestLimite } from '../../25-pagamento-revisao/dto/request/pagamento-revisao.request-list';
import { ComentarioModeracaoResponse } from '../dto/response/comentario.response';
import { ComentarioServiceFindAllModeracao } from '../service/comentario.service.findall-moderacao';

// Ocultar e mostrar de novo usam o PATCH /comentario/:id que já existe ({ ativo, endossado }); o banco garante que só
// a moderação devolve ao ar um comentário oculto (fn_bloqueia_reversao_moderacao_comentario, 05).
@Controller('comentario')
export class ComentarioControllerFindAllModeracao {
  constructor(private readonly service: ComentarioServiceFindAllModeracao) {}

  // A RLS escopa (moderação vê todos). O limite é o mesmo das listas do painel.
  @Get('moderacao')
  listar(
    @Query() query: PagamentoRevisaoRequestLimite,
  ): Promise<ComentarioModeracaoResponse[]> {
    return this.service.executar(query.limite);
  }
}
