import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { LinkAcademicoServiceRemove } from '../service/link-academico.service.remove';

@Controller('link-academico')
export class LinkAcademicoControllerRemove {
  constructor(private readonly service: LinkAcademicoServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id', ParseIntPipe) id: number) {
    await this.service.executar(id);
  }
}
