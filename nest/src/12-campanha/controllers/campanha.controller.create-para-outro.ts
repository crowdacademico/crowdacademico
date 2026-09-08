import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaRequestCreate } from '../dto/request/campanha.request-create';
import { CampanhaServiceCreateParaOutro } from '../service/campanha.service.create-para-outro';

// Rota COM :id, de propósito - diferente do self-service (POST /campanha,
// sem :id, sempre a própria conta). Ação de suporte/admin (gateada por
// 'campanha_criar_para_outro' dentro da função do banco, não aqui).
@Controller('campanha')
export class CampanhaControllerCreateParaOutro {
  constructor(private readonly service: CampanhaServiceCreateParaOutro) {}

  @Post(':idUsuario')
  @UseGuards(RequireAuthGuard)
  criarParaOutro(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Body() dto: CampanhaRequestCreate,
  ) {
    return this.service.executar(idUsuario, dto);
  }
}
