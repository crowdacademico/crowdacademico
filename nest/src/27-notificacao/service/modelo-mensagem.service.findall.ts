import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import {
  MENSAGEM_SEM_PERMISSAO_MODELO_MENSAGEM,
  PERMISSAO_MODELO_MENSAGEM,
} from '../constants/notificacao.constants';
import { ModeloMensagemConverter } from '../dto/converter/modelo-mensagem.converter';
import { ModeloMensagemResponse } from '../dto/response/modelo-mensagem.response';

// Tela Mensagens: o texto de cada aviso por evento e canal. A permissão é checada aqui porque a RLS deixa todos lerem
// (o worker de e-mail e o sino de qualquer conta usam os modelos).
@Injectable()
export class ModeloMensagemServiceFindAll {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async executar(): Promise<ModeloMensagemResponse[]> {
    await this.autorizacao.exigirPermissao(
      PERMISSAO_MODELO_MENSAGEM,
      MENSAGEM_SEM_PERMISSAO_MODELO_MENSAGEM,
    );
    const linhas = await this.database
      .getDb()
      .selectFrom('modelo_mensagem')
      .selectAll()
      .orderBy('id_modelo_mensagem')
      .execute();
    return linhas.map((linha) =>
      ModeloMensagemConverter.paraResponseDto(linha),
    );
  }
}
