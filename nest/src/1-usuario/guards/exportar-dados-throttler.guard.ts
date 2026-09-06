import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

// GET /usuario/eu/exportar-dados (LGPD Art. 18, item 3 de PROXIMOS_PASSOS.md)
// devolve, num pacote só, tudo que existe sobre uma conta - o endereço mais
// sensível do sistema. Rate limit é obrigatório, não
// opcional, mas o `ThrottlerGuard` padrão (usado em POST /auth/login/
// cadastro) rastreia por IP - errado aqui: o objetivo não é proteger o
// SERVIDOR de tráfego excessivo, é impedir que uma conta comprometida seja
// raspada repetidamente, então o limite tem que ser POR CONTA, não por IP
// (um IP compartilhado - escritório, faculdade - não pode travar todo mundo
// por causa de uma exportação de outra pessoa).
//
// `getTracker` sobrescrito pra usar `req.user.idUsuario` em vez do IP -
// `RequireAuthGuard` já roda antes (ver ordem em @UseGuards no controller),
// então `req.user` sempre existe aqui dentro; JwtAuthGuard (global) é quem
// preenche esse campo.
@Injectable()
export class ExportarDadosThrottlerGuard extends ThrottlerGuard {
  // Assinatura herdada de ThrottlerGuard exige Promise<string>; aqui não há
  // nada pra aguardar (RequireAuthGuard já populou req.user antes deste
  // guard rodar).
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getTracker(req: Request): Promise<string> {
    return String(req.user!.idUsuario);
  }
}
