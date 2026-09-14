import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { TermoUsoRequestCriar } from '../dto/request/termo-uso.request-criar';
import { TermoUsoServiceCriar } from '../service/termo-uso.service.criar';

@Controller('termos-uso')
export class TermoUsoControllerCriar {
  constructor(private readonly service: TermoUsoServiceCriar) {}

  @Post()
  @UseGuards(RequireAuthGuard)
  criar(@Body() dto: TermoUsoRequestCriar) {
    return this.service.executar(dto);
  }
}
