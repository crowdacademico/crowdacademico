import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AtribuirPapelRequestDto } from '../dto/request/atribuir-papel.request.dto';
import { UsuarioPapelServiceCreate } from '../service/usuario-papel.service.create';

@Controller('usuario-papel')
export class UsuarioPapelControllerCreate {
  constructor(private readonly service: UsuarioPapelServiceCreate) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  atribuir(@Body() dto: AtribuirPapelRequestDto) {
    return this.service.executar(dto);
  }
}
