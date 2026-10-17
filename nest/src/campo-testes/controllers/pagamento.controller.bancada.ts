import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { SemTransacaoGlobal } from '../../commons/database/sem-transacao-global.decorator';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { ContaRecebimentoRequestCreate } from '../../30-conta-recebimento/dto/request/conta-recebimento.request-create';
import { ContaRecebimentoResponse } from '../../30-conta-recebimento/dto/response/conta-recebimento.response';
import { PagamentoBancadaEstado } from '../dto/pagamento-bancada.response';
import {
  PagamentoServiceBancada,
  TAREFAS_BANCADA,
  type TarefaBancada,
} from '../service/pagamento.service.bancada';

const MENSAGEM_SEM_PERMISSAO =
  'Só quem resolve revisões de pagamento usa a bancada.';

// Bancada de pagamento do Campo de Testes (T05). Uma ferramenta só, por isso um controller só: ver o estado, agir
// como o provedor e rodar as tarefas automáticas na hora. Tudo exige 'pagamento_revisao_resolver', menos cadastrar
// a chave Pix de teste, que é da própria conta logada (o pesquisador).
@Controller('campo-testes/pagamento')
export class PagamentoControllerBancada {
  constructor(
    private readonly service: PagamentoServiceBancada,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  @Get()
  async estado(): Promise<PagamentoBancadaEstado> {
    await this.exigirPermissao();
    return this.service.estado();
  }

  @Post('contribuicoes/:id/pagar')
  @HttpCode(204)
  async pagar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.exigirPermissao();
    await this.service.pagar(id);
  }

  @Post('contribuicoes/:id/vencer')
  @HttpCode(204)
  async vencer(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.exigirPermissao();
    await this.service.vencer(id);
  }

  @Post('contribuicoes/:id/repetir-aviso')
  @HttpCode(204)
  async repetirAviso(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.exigirPermissao();
    await this.service.repetirAviso(id);
  }

  @Post('repasses/:id/concluir')
  @HttpCode(204)
  async concluir(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.exigirPermissao();
    await this.service.concluirTransferencia(id, false);
  }

  @Post('repasses/:id/falhar')
  @HttpCode(204)
  async falhar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.exigirPermissao();
    await this.service.concluirTransferencia(id, true);
  }

  @Post('tarefas/:tarefa')
  @HttpCode(204)
  async rodar(@Param('tarefa') tarefa: string): Promise<void> {
    if (!(TAREFAS_BANCADA as readonly string[]).includes(tarefa)) {
      throw new BadRequestException(`Tarefa desconhecida: ${tarefa}.`);
    }
    await this.exigirPermissao();
    await this.service.rodar(tarefa as TarefaBancada);
  }

  // @SemTransacaoGlobal: a rota de verdade (POST /conta-recebimento) também é, porque consulta o diretório Pix do
  // provedor fora de qualquer transação.
  @Post('chave-pix')
  @SemTransacaoGlobal()
  cadastrarChavePix(
    @Body() dto: ContaRecebimentoRequestCreate,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<ContaRecebimentoResponse | null> {
    return this.service.cadastrarChavePix(dto, usuario.idUsuario);
  }

  private exigirPermissao(): Promise<void> {
    return this.autorizacao.exigirPermissao(
      'pagamento_revisao_resolver',
      MENSAGEM_SEM_PERMISSAO,
    );
  }
}
