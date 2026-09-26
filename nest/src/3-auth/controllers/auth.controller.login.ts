import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthRequestLogin } from '../dto/request/auth.request-login';
import { AuthServiceLogin } from '../service/auth.service.login';

@Controller('auth')
export class AuthControllerLogin {
  constructor(private readonly service: AuthServiceLogin) {}

  // bcrypt é lento DE PROPÓSITO (~100ms por verificação, ver auth.service.login.ts): sem limite nenhum, é fácil
  // derrubar o servidor só de CPU mandando muitas tentativas de login em paralelo, mesmo com senha errada e sem
  // precisar de conta válida (DoS barato). 5 tentativas por 60s por IP em produção: generoso o bastante para
  // alguém errando a senha de verdade, apertado o bastante para travar um script tentando muitas senhas
  // seguidas. Isto é ALÉM do `limite_tentativas_login` do banco (03_funcoes_seguranca.sql), que já bloqueia POR
  // CONTA depois de N falhas: o throttler aqui protege o SERVIDOR (CPU/rede), não uma conta específica; um
  // ataque espalhado por várias contas diferentes não aciona o bloqueio do banco, mas aciona este.
  //
  // Limite maior fora de produção: o <dev> "Entrar como" (dev-login-rapido) dispara um POST /auth/login por
  // clique, e tem 7 contas no dropdown: testar 6+ delas em menos de 1 minuto (uso normal do botão) esbarraria
  // nos 5/60s e travaria, em silêncio, TODOS os logins (o limite é por IP, não por conta) pelo resto da janela.
  // 5/60s vale em produção (NODE_ENV=production); em dev fica 30/60s, folgado o bastante para passear pelo
  // dropdown inteiro.
  //
  // Este limite é declarado AQUI e não só no `ThrottlerModule.forRoot()` de auth.module.ts: o módulo é
  // `@Global()` (token de opções compartilhado), então qualquer outro `forRoot()` no processo vence o default
  // (usuario.module.ts registrava um segundo, para o limite de exportar-dados, e deixou o login limitado a
  // 1/hora em silêncio). Regra: rota sensível declara o PRÓPRIO `@Throttle()`, nunca depende do default do
  // módulo (ver app.module.ts).
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 5 : 30,
      ttl: 60_000,
    },
  })
  @UseGuards(ThrottlerGuard)
  @Post('login')
  login(@Body() dto: AuthRequestLogin, @Req() request: Request) {
    return this.service.executar(
      dto,
      request.ip ?? request.socket.remoteAddress,
      request.headers['user-agent'],
    );
  }
}
