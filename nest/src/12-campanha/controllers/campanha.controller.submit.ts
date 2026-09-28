import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CampanhaServiceEnviar } from '../service/campanha.service.submit';

@Controller('campanha')
export class CampanhaControllerEnviar {
  constructor(private readonly service: CampanhaServiceEnviar) {}

  // Sem `request.user` aqui, diferente de aprovar/rejeitar: aqueles carimbam
  // `id_admin` com quem decidiu, este não carimba nada. Quem é o dono já está
  // na linha, e a trigger de transição compara com `id_usuario_atual()`
  // direto no banco.
  @Post(':id/enviar')
  enviar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
