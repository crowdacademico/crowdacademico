import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { CadastroRequestDto } from '../dto/request/cadastro.request.dto';
import { AuthServiceCadastro } from '../service/auth.service.cadastro';

@Controller('auth')
export class AuthControllerCadastro {
  constructor(private readonly service: AuthServiceCadastro) {}

  // ThrottlerGuard aqui pelo mesmo motivo de POST /auth/login (ver
  // auth.controller.login.ts): bcrypt.hash é custoso de CPU, e criar conta é
  // o tipo de endpoint público que atrai spam/automação sem exigir NADA
  // antes (nem uma conta válida).
  @UseGuards(ThrottlerGuard)
  @Post('cadastro')
  cadastro(@Body() dto: CadastroRequestDto, @Req() request: Request) {
    return this.service.executar(
      dto,
      request.ip ?? request.socket.remoteAddress,
      request.headers['user-agent'],
    );
  }
}
