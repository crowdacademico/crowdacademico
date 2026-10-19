import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CampanhaServiceForceRemove } from '../service/campanha.service.force-remove';

// POST, não DELETE /campanha/:id (rota já ocupada pelo self-service
// restrito, CampanhaControllerRemove) - ação distinta, de propósito, não
// um CRUD genérico (mesmo padrão de aprovar/rejeitar/suspender).
@Controller('campanha')
export class CampanhaControllerForceRemove {
  constructor(private readonly service: CampanhaServiceForceRemove) {}

  @Post(':id/forcar-exclusao')
  @HttpCode(204)
  forcarExclusao(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
