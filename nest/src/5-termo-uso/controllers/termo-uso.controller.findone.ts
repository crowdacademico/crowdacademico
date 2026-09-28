import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TermoUsoServiceFindOne } from '../service/termo-uso.service.findone';

// Registrado no módulo DEPOIS de TermoUsoControllerFindActive de propósito - os
// dois são GET no mesmo prefixo ('termos-uso'), e o Express/Nest resolve
// por ORDEM DE REGISTRO quando o caminho é ambíguo entre literal ('ativo')
// e parâmetro (':id'). Registrar Buscar antes faria '/termos-uso/ativo'
// cair aqui, tentando converter "ativo" pra número e quebrando com 400.
@Controller('termos-uso')
export class TermoUsoControllerFindOne {
  constructor(private readonly service: TermoUsoServiceFindOne) {}

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
