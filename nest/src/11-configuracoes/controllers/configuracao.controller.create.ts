import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
// import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { CriarConfiguracaoRequestDto } from '../dto/request/criar-configuracao.request.dto';
import { ConfiguracaoServiceCreate } from '../service/configuracao.service.create';

@Controller('configuracoes')
export class ConfiguracaoControllerCreate {
  constructor(private readonly service: ConfiguracaoServiceCreate) {}

  @Post()
  // ⚠️ SUSPENSO PARA DESENVOLVIMENTO (02-08-2026, pedido explícito do Lucas)
  // — ver temp_Nest_React.md, seção "Login suspenso para dev". Reativar
  // (@UseGuards(RequireAuthGuard), desfazer o comentário no import acima)
  // antes de qualquer apresentação/uso real — sem isso, request.user pode
  // vir undefined e o `!` abaixo mente sobre isso.
  // @UseGuards(RequireAuthGuard)
  criar(@Body() dto: CriarConfiguracaoRequestDto, @Req() request: Request) {
    // request.user pode vir undefined agora que o guard está suspenso — o
    // `!` abaixo é o mesmo de antes (guard garantia isso), mantido de
    // propósito pra não mudar comportamento nenhum além de suspender o
    // login: chamar isto sem estar logado e sem `dto.global: true` quebra
    // com erro cru, e é esperado enquanto durar a suspensão.
    return this.service.executar(dto, request.user!.idUsuario);
  }
}
