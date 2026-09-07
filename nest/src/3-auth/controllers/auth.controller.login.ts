import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthRequestLogin } from '../dto/request/auth.request-login';
import { AuthServiceLogin } from '../service/auth.service.login';

@Controller('auth')
export class AuthControllerLogin {
  constructor(private readonly service: AuthServiceLogin) {}

  // Achado de uma IA (03-08-2026): bcrypt é lento DE PROPÓSITO (~100ms por
  // verificação, ver auth.service.login.ts) - sem limite nenhum, é fácil
  // derrubar o servidor só de CPU mandando muitas tentativas de login em
  // paralelo, mesmo com senha errada e sem precisar de conta válida (DoS
  // barato). 5 tentativas por 60s por IP em produção - generoso o bastante
  // pra alguém errando a senha de verdade, apertado o bastante pra travar
  // um script tentando muitas senhas seguidas. Isto é ALÉM do
  // `limite_tentativas_login` do banco (03_funcoes_seguranca.sql), que já
  // bloqueia POR CONTA depois de N falhas - o throttler aqui protege o
  // SERVIDOR (CPU/rede), não uma conta específica; um ataque espalhado por
  // várias contas diferentes não aciona o bloqueio do banco, mas aciona este.
  //
  // Limite maior fora de produção (achado 07-08-2026): o próprio <dev>
  // "Entrar como" (dev-login-rapido.jsx) dispara um POST /auth/login por
  // clique, e tem 7 contas no dropdown - testar 6+ delas em menos de 1
  // minuto (uso normal do botão) já esbarrava nos 5/60s e travava, em
  // silêncio, TODOS os logins (o limite é por IP, não por conta) pelo resto
  // da janela. 5/60s continua valendo em produção (NODE_ENV=production); em
  // dev fica 30/60s, folgado o bastante pra passear pelo dropdown inteiro
  // sem esbarrar.
  //
  // CORRIGIDO (07-09-2026): este limite morava só no `ThrottlerModule.
  // forRoot()` de auth.module.ts, nunca declarado aqui - achado (e
  // confirmado ao vivo) que isso deixou o login à mercê de QUALQUER outro
  // `forRoot()` no processo (o módulo é `@Global()`, token de opções
  // compartilhado). `usuario.module.ts` registrava um segundo, pro limite
  // de exportar-dados, e venceu - login ficou limitado a 1/hora em
  // silêncio. Regra daqui pra frente: rota sensível declara o PRÓPRIO
  // `@Throttle()`, nunca depende do default do módulo (ver app.module.ts).
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
