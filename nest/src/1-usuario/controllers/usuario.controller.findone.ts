import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { UsuarioServiceFindOne } from '../service/usuario.service.findone';

// Exige login (guarda global, não é @Publico()): mesmo motivo de usuario.controller.findall.ts. A checagem "o próprio ou quem tem
// usuario_visualizar_sensivel" fica aqui e não no service porque login/refresh reaproveitam
// UsuarioServiceFindOne antes de existir alguém autenticado.
@Controller('usuario')
export class UsuarioControllerFindOne {
  constructor(
    private readonly service: UsuarioServiceFindOne,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  @Get(':id')
  async buscar(@Param('id', ParseIntPipe) id: number) {
    await this.autorizacao.exigirProprioOuPermissao(
      id,
      'usuario_visualizar_sensivel',
      'Você só pode ver os dados do seu próprio usuário.',
    );
    return this.service.executar(id);
  }
}
