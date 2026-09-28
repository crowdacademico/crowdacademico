import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CampanhaRequestCreate } from '../dto/request/campanha.request-create';
import { CampanhaServiceCreateParaOutro } from '../service/campanha.service.create-for-other';

// Rota COM :id, de propósito - diferente do self-service (POST /campanha,
// sem :id, sempre a própria conta). Ação de suporte/admin (gateada por
// 'campanha_criar_para_outro' dentro da função do banco, não aqui).
@Controller('campanha')
export class CampanhaControllerCreateParaOutro {
  constructor(private readonly service: CampanhaServiceCreateParaOutro) {}

  @Post(':idUsuario')
  criarParaOutro(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Body() dto: CampanhaRequestCreate,
  ) {
    return this.service.executar(idUsuario, dto);
  }
}
