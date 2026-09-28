import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsuarioGuardExportDataThrottler } from '../guards/usuario.guard.export-data-throttler';
import { UsuarioServiceExportData } from '../service/usuario.service.export-data';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

// LGPD Art. 18 (portabilidade/acesso), RF-016: exportação de dados.
//
// Rota SEM :id, de propósito: este é o endereço mais sensível do sistema (devolve, num pacote só, tudo que
// existe sobre uma pessoa). Aceitar um identificador na rota abriria a porta para o erro clássico de trocar o
// número e baixar dado de outra conta (a RLS provavelmente barraria, mas a boa prática é nem deixar o parâmetro
// existir). O ator é sempre quem está autenticado; se um dia o suporte precisar exportar em nome de alguém,
// isso vira um endereço SEPARADO, atrás de permissão nomeada, com auditoria própria, nunca este.
@Controller('usuario')
export class UsuarioControllerExportData {
  constructor(private readonly service: UsuarioServiceExportData) {}

  // A guarda de login é global e roda antes de qualquer guarda de rota: `request.user` sempre existe quando
  // UsuarioGuardExportDataThrottler lê `idUsuario`. @Throttle sobrescreve o default genérico do módulo
  // (app.module.ts, só rede de segurança) pro limite certo aqui: 1 por
  // hora, por CONTA (ver comentário completo em
  // usuario.guard.export-data-throttler.ts).
  @UseGuards(UsuarioGuardExportDataThrottler)
  @Throttle({ default: { limit: 1, ttl: 3_600_000 } })
  // Nunca cacheável, em lugar nenhum do caminho (proxy, CDN, navegador) -
  // é o tipo de conteúdo que não pode ficar guardado em nenhum intermediário.
  @Header('Cache-Control', 'no-store')
  @Get('eu/exportar-dados')
  exportar(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.executar(usuario.idUsuario);
  }
}
