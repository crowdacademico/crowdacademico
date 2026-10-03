import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ComentarioRequestCreate } from '../dto/request/comentario.request-create';
import { ComentarioServiceCreateForOther } from '../service/comentario.service.create-for-other';

// Rota COM :idPesquisador, de propósito: diferente do comentário normal (POST /comentario, sempre a própria
// conta). Ferramenta de teste, gateada por 'comentario_criar_para_outro' dentro da função do banco.
@Controller('comentario')
export class ComentarioControllerCreateForOther {
  constructor(private readonly service: ComentarioServiceCreateForOther) {}

  @Post(':idPesquisador')
  comentarParaOutro(
    @Param('idPesquisador', ParseIntPipe) idPesquisador: number,
    @Body() dto: ComentarioRequestCreate,
  ) {
    return this.service.executar(idPesquisador, dto);
  }
}
