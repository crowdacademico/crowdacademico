import {
  Body,
  Controller,
  HttpCode,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthRequestMyEmail } from '../dto/request/auth.request-my-email';
import { AuthServiceMyEmail } from '../service/auth.service.my-email';

// Bloqueio parcial do e-mail não confirmado (22-11-2026). Sempre a conta logada (request.user), nunca um id da URL.
// Limite baixo: cada chamada manda um e-mail.
@Controller('auth')
export class AuthControllerMyEmail {
  constructor(private readonly service: AuthServiceMyEmail) {}

  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 3 : 30,
      ttl: 60_000,
    },
  })
  @UseGuards(ThrottlerGuard)
  @Post('reenviar-minha-verificacao')
  @HttpCode(204)
  reenviar(@Req() request: Request) {
    return this.service.reenviar(request.user!.idUsuario);
  }

  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 3 : 30,
      ttl: 60_000,
    },
  })
  @UseGuards(ThrottlerGuard)
  @Patch('meu-email')
  @HttpCode(204)
  alterar(@Req() request: Request, @Body() dto: AuthRequestMyEmail) {
    return this.service.alterar(request.user!.idUsuario, dto.email);
  }
}
