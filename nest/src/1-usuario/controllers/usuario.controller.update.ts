import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AtualizarUsuarioRequestDto } from '../dto/request/atualizar-usuario.request.dto';
import { UsuarioServiceUpdate } from '../service/usuario.service.update';

@Controller('usuario')
export class UsuarioControllerUpdate {
  constructor(private readonly service: UsuarioServiceUpdate) {}

  @Patch(':id')
  @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarUsuarioRequestDto,
  ) {
    return this.service.executar(id, dto);
  }
}
