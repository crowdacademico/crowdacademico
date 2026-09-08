import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CampanhaServiceForcarExclusao } from '../service/campanha.service.forcar-exclusao';

// POST, não DELETE /campanha/:id (rota já ocupada pelo self-service
// restrito, CampanhaControllerRemove) - ação distinta, de propósito, não
// um CRUD genérico (mesmo padrão de aprovar/rejeitar/suspender).
@Controller('campanha')
export class CampanhaControllerForcarExclusao {
  constructor(private readonly service: CampanhaServiceForcarExclusao) {}

  @Post(':id/forcar-exclusao')
  @HttpCode(204)
  @UseGuards(RequireAuthGuard)
  forcarExclusao(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
