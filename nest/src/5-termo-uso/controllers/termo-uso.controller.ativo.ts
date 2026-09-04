import { Controller, Get } from '@nestjs/common';
import { TermoUsoServiceAtivo } from '../service/termo-uso.service.ativo';

// Sem guard de propósito - precisa ser lido por quem ainda não tem conta
// (tela de Cadastro). Autorização real de escrita fica em
// pol_termos_insert/update ('termos_uso_gerenciar'), este endpoint só lê.
@Controller('termos-uso')
export class TermoUsoControllerAtivo {
  constructor(private readonly service: TermoUsoServiceAtivo) {}

  @Get('ativo')
  ativo() {
    return this.service.executar();
  }
}
