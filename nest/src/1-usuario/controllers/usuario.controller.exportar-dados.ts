import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ExportarDadosThrottlerGuard } from '../guards/exportar-dados-throttler.guard';
import { UsuarioServiceExportarDados } from '../service/usuario.service.exportar-dados';

// LGPD Art. 18 (portabilidade/acesso) - item 3 de PROXIMOS_PASSOS.md.
//
// Rota SEM :id, de propósito (decisão de uma IA) - este é, disparado, o
// endereço mais sensível do sistema: devolve, num pacote só, tudo que
// existe sobre uma pessoa. Aceitar um identificador na rota abriria a
// porta pro erro clássico de trocar o número e baixar dado de outra conta
// (a RLS provavelmente barraria, mas a boa prática é nem deixar o
// parâmetro existir). O ator é sempre quem está autenticado - se um dia o
// suporte precisar exportar em nome de alguém, isso vira um endereço
// SEPARADO, atrás de permissão nomeada, com auditoria própria - nunca este.
@Controller('usuario')
export class UsuarioControllerExportarDados {
  constructor(private readonly service: UsuarioServiceExportarDados) {}

  // RequireAuthGuard ANTES do throttler, de propósito - garante que
  // `request.user` sempre existe quando ExportarDadosThrottlerGuard tenta
  // ler `request.user.idUsuario` (guards de um mesmo @UseGuards() rodam na
  // ordem do array). @Throttle sobrescreve o default do módulo (5-30/min,
  // pensado pra bcrypt) pro limite certo aqui: 1 por hora, por CONTA (ver
  // comentário completo em exportar-dados-throttler.guard.ts).
  @UseGuards(RequireAuthGuard, ExportarDadosThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 3_600_000 } })
  // Nunca cacheável, em lugar nenhum do caminho (proxy, CDN, navegador) -
  // é o tipo de conteúdo que não pode ficar guardado em nenhum intermediário.
  @Header('Cache-Control', 'no-store')
  @Get('eu/exportar-dados')
  exportar(@Req() request: Request) {
    return this.service.executar(request.user!.idUsuario);
  }
}
