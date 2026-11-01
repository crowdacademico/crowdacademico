import { Controller, Get } from '@nestjs/common';
import { ModeloMensagemServiceFindAll } from '../service/modelo-mensagem.service.findall';

// Tela Mensagens (Configurações). Exige configuracao_gerenciar.
@Controller('modelo-mensagem')
export class ModeloMensagemControllerFindAll {
  constructor(private readonly service: ModeloMensagemServiceFindAll) {}

  @Get()
  listar() {
    return this.service.executar();
  }
}
