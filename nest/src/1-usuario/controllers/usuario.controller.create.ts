import { Body, Controller, Post } from '@nestjs/common';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { UsuarioRequestCreate } from '../dto/request/usuario.request-create';
import { UsuarioServiceCreate } from '../service/usuario.service.create';

// "Criar usuário" do painel: exige login (guarda global) e a permissão usuario_criar. Quem cria a própria conta
// passa pelo POST /auth/cadastro, que também grava o aceite dos Termos de Uso; esta rota não pode virar
// @Publico(), senão um anônimo criaria conta por aqui pulando o aceite. A checagem da permissão fica aqui e não
// no service porque o cadastro público reaproveita UsuarioServiceCreate sem ninguém logado (e a policy de INSERT
// em usuario é WITH CHECK (true) pelo mesmo motivo, ver [04-D-2]).
@Controller('usuario')
export class UsuarioControllerCreate {
  constructor(
    private readonly service: UsuarioServiceCreate,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  @Post()
  async criar(@Body() dto: UsuarioRequestCreate) {
    await this.autorizacao.exigirPermissao(
      'usuario_criar',
      'Você não tem permissão para criar usuários.',
    );
    return this.service.executar(dto);
  }
}
