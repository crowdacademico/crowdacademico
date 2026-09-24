import { BadRequestException, Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import { ConfiguracaoConverter } from '../dto/converter/configuracao.converter';
import { ConfiguracaoRequestUpdate } from '../dto/request/configuracao.request-update';
import { ConfiguracaoResponse } from '../dto/response/configuracao.response';

@Injectable()
export class ConfiguracaoServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idConfig: number,
    dto: ConfiguracaoRequestUpdate,
  ): Promise<ConfiguracaoResponse> {
    const db = this.database.getDb();

    const campos = {
      ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
      ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
      ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      ...(dto.publica !== undefined ? { publica: dto.publica } : {}),
    };
    if (Object.keys(campos).length === 0) {
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const linha = await db
      .updateTable('configuracoes')
      .set(campos)
      .where('id_config', '=', idConfig)
      .returningAll()
      .executeTakeFirst();

    if (!linha) {
      // pol_config_update (04): dono (id_usuario = self) OU
      // 'configuracao_gerenciar' pra linha global. 0 linhas afetadas sem
      // erro é a RLS filtrando - diferencia de "não existe".
      return await distinguir404ou403(
        db,
        'configuracoes',
        { id_config: idConfig },
        `Configuração ${idConfig} não encontrada`,
        'Sem permissão para editar esta configuração.',
      );
    }

    return ConfiguracaoConverter.paraResponseDto(linha);
  }
}
