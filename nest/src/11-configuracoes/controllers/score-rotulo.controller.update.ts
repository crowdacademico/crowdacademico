import { Body, Controller, Patch } from '@nestjs/common';
import { ScoreRotuloRequestUpdate } from '../dto/request/score-rotulo.request-update';
import { ScoreRotuloServiceUpdate } from '../service/score-rotulo.service.update';

@Controller('score-config')
export class ScoreRotuloControllerUpdate {
  constructor(private readonly service: ScoreRotuloServiceUpdate) {}

  @Patch('faixas')
  atualizar(@Body() dto: ScoreRotuloRequestUpdate) {
    return this.service.executar(dto);
  }
}
