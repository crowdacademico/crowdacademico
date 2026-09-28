import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { SuspensaoRequestDto } from '../../commons/moderacao/dto/suspensao.request.dto';
import { PerfilPesquisadorServiceSuspend } from '../service/perfil-pesquisador.service.suspend';

@Controller('perfil-pesquisador')
export class PerfilPesquisadorControllerSuspend {
  constructor(private readonly service: PerfilPesquisadorServiceSuspend) {}

  @Get(':id/suspensao')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarSuspensao(id);
  }

  @Post(':id/suspender')
  @HttpCode(204)
  suspender(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuspensaoRequestDto,
  ) {
    return this.service.executar(id, dto.ate, dto.motivo);
  }
}
