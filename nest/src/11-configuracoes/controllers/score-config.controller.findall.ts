import { Controller, Get } from '@nestjs/common';
import { ScoreConfigServiceFindAll } from '../service/score-config.service.findall';

@Controller('score-config')
export class ScoreConfigControllerFindAll {
  constructor(private readonly service: ScoreConfigServiceFindAll) {}

  @Get()
  listar() {
    return this.service.executar();
  }
}
