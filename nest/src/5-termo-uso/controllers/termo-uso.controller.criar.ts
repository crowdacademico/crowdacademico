import { Body, Controller, Post } from '@nestjs/common';
import { TermoUsoRequestCriar } from '../dto/request/termo-uso.request-criar';
import { TermoUsoServiceCriar } from '../service/termo-uso.service.criar';

@Controller('termos-uso')
export class TermoUsoControllerCriar {
  constructor(private readonly service: TermoUsoServiceCriar) {}

  @Post()
  criar(@Body() dto: TermoUsoRequestCriar) {
    return this.service.executar(dto);
  }
}
