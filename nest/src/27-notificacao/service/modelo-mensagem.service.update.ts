import { BadRequestException, Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import {
  MENSAGEM_SEM_PERMISSAO_MODELO_MENSAGEM,
  camposDoTipo,
} from '../constants/notificacao.constants';
import { ModeloMensagemConverter } from '../dto/converter/modelo-mensagem.converter';
import { ModeloMensagemRequestUpdate } from '../dto/request/modelo-mensagem.request-update';
import { ModeloMensagemResponse } from '../dto/response/modelo-mensagem.response';
import { validarModelo } from '../util/validar-modelo';

// Muda o texto ou liga/desliga o canal de um aviso. Vale para o próximo envio (e-mail) e a próxima leitura (sino); o
// histórico do texto fica no registro de auditoria (gatilho de modelo_mensagem, 05).
@Injectable()
export class ModeloMensagemServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idModeloMensagem: number,
    dto: ModeloMensagemRequestUpdate,
  ): Promise<ModeloMensagemResponse> {
    const db = this.database.getDb();
    const atual = await db
      .selectFrom('modelo_mensagem')
      .select(['tipo_evento'])
      .where('id_modelo_mensagem', '=', idModeloMensagem)
      .executeTakeFirst();

    if (atual) {
      const campos = camposDoTipo(atual.tipo_evento);
      const erro =
        (dto.titulo !== undefined
          ? validarModelo('Título', dto.titulo, campos)
          : null) ??
        (dto.corpo !== undefined
          ? validarModelo('Texto', dto.corpo, campos)
          : null);
      if (erro) throw new BadRequestException(erro);
    }

    const campos = {
      ...(dto.titulo !== undefined ? { titulo: dto.titulo.trim() } : {}),
      ...(dto.corpo !== undefined ? { corpo: dto.corpo.trim() } : {}),
      ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
    };
    if (Object.keys(campos).length === 0) {
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const linha = await db
      .updateTable('modelo_mensagem')
      .set({ ...campos, atualizado_em: new Date() })
      .where('id_modelo_mensagem', '=', idModeloMensagem)
      .returningAll()
      .executeTakeFirst();

    if (!linha) {
      // pol_modelo_mensagem_update (04): só configuracao_gerenciar.
      return await distinguir404ou403(
        db,
        'modelo_mensagem',
        { id_modelo_mensagem: idModeloMensagem },
        `Mensagem ${idModeloMensagem} não encontrada.`,
        MENSAGEM_SEM_PERMISSAO_MODELO_MENSAGEM,
      );
    }
    return ModeloMensagemConverter.paraResponseDto(linha);
  }
}
