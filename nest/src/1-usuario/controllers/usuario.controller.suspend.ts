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
import { UsuarioServiceSuspend } from '../service/usuario.service.suspend';

@Controller('usuario')
export class UsuarioControllerSuspend {
  constructor(private readonly service: UsuarioServiceSuspend) {}

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
    return this.service.suspender(id, dto.ate, dto.motivo);
  }

  @Post(':id/revogar-suspensao')
  @HttpCode(204)
  revogar(@Param('id', ParseIntPipe) id: number) {
    return this.service.revogar(id);
  }
}
