import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ModeloMensagemRequestUpdate } from '../dto/request/modelo-mensagem.request-update';
import { ModeloMensagemServiceUpdate } from '../service/modelo-mensagem.service.update';

@Controller('modelo-mensagem')
export class ModeloMensagemControllerUpdate {
  constructor(private readonly service: ModeloMensagemServiceUpdate) {}

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModeloMensagemRequestUpdate,
  ) {
    return this.service.executar(id, dto);
  }
}
