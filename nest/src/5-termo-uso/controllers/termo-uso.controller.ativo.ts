import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';
import { TermoUsoServiceAtivo } from '../service/termo-uso.service.ativo';
import { TIPOS_TERMO } from '../../commons/database/db.types';
import type { TipoTermo } from '../../commons/database/db.types';

// Sem guard de propósito - precisa ser lido por quem ainda não tem conta
// (tela de Cadastro). Autorização real de escrita fica em
// pol_termos_insert/update ('termos_uso_gerenciar'), este endpoint só lê.
//
// `tipo` obrigatório (13-09-2026) - desde a separação em 2 termos ativos
// simultâneos, "o termo ativo" sem dizer qual trilha (cadastro/
// contribuicao) virou ambíguo. `ParseEnumPipe` valida contra TIPOS_TERMO e
// já devolve 400 sozinho se vier vazio/valor fora da lista.
@Controller('termos-uso')
export class TermoUsoControllerAtivo {
  constructor(private readonly service: TermoUsoServiceAtivo) {}

  @Get('ativo')
  ativo(@Query('tipo', new ParseEnumPipe(TIPOS_TERMO)) tipo: TipoTermo) {
    return this.service.executar(tipo);
  }
}
