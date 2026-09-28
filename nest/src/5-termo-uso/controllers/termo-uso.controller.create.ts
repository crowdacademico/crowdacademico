import { Body, Controller, Post } from '@nestjs/common';
import { TermoUsoRequestCreate } from '../dto/request/termo-uso.request-create';
import { TermoUsoServiceCreate } from '../service/termo-uso.service.create';

@Controller('termos-uso')
export class TermoUsoControllerCreate {
  constructor(private readonly service: TermoUsoServiceCreate) {}

  @Post()
  criar(@Body() dto: TermoUsoRequestCreate) {
    return this.service.executar(dto);
  }
}
