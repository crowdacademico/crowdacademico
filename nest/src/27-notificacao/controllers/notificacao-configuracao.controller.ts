import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ModeloMensagemRequestNovaVersao } from '../dto/request/modelo-mensagem.request-nova-versao';
import { NotificacaoRegraRequestUpdate } from '../dto/request/notificacao-regra.request-update';
import { NotificacaoConfiguracaoService } from '../service/notificacao-configuracao.service';

/** Rotas administrativas; o service exige configuracao_gerenciar e o banco também aplica RLS. */
@Controller('notificacoes/configuracao')
export class NotificacaoConfiguracaoController {
  constructor(private readonly service: NotificacaoConfiguracaoService) {}

  /** Regras de canal por evento + todos os modelos (e-mail e sino), com todas as versões. */
  @Get()
  listar() {
    return this.service.listar();
  }

  /** Liga/desliga o canal de um evento. */
  @Patch('regras/:id')
  atualizarRegra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: NotificacaoRegraRequestUpdate,
  ) {
    return this.service.atualizarRegra(id, dto);
  }

  /** Muda o conteúdo: cria a próxima versão do modelo (e-mail ou sino, conforme o canal do modelo :id). */
  @Post('modelos/:id/versoes')
  criarVersao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModeloMensagemRequestNovaVersao,
  ) {
    return this.service.criarNovaVersao(id, dto);
  }
}