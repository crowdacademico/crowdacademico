import { Body, Controller, Post } from '@nestjs/common';
import { UsuarioRequestCreate } from '../dto/request/usuario.request-create';
import { UsuarioServiceCreate } from '../service/usuario.service.create';

// "Criar usuário" do painel: exige login (guarda global). Quem cria a própria conta passa pelo POST /auth/cadastro,
// que também grava o aceite dos Termos de Uso; esta rota não pode virar @Publico(), senão um anônimo criaria
// conta por aqui pulando o aceite.
@Controller('usuario')
export class UsuarioControllerCreate {
  constructor(private readonly service: UsuarioServiceCreate) {}

  @Post()
  criar(@Body() dto: UsuarioRequestCreate) {
    return this.service.executar(dto);
  }
}
