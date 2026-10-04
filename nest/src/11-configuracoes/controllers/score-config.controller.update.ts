import { Body, Controller, Patch } from '@nestjs/common';
import { ScoreConfigRequestUpdate } from '../dto/request/score-config.request-update';
import { ScoreConfigServiceUpdate } from '../service/score-config.service.update';

@Controller('score-config')
export class ScoreConfigControllerUpdate {
  constructor(private readonly service: ScoreConfigServiceUpdate) {}

  @Patch('pesos')
  atualizar(@Body() dto: ScoreConfigRequestUpdate) {
    return this.service.executar(dto);
  }
}
