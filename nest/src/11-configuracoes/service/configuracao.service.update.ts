import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ConfiguracaoConverter } from '../dto/converter/configuracao.converter';
import { AtualizarConfiguracaoRequestDto } from '../dto/request/atualizar-configuracao.request.dto';
import { ConfiguracaoResponseDto } from '../dto/response/configuracao.response.dto';

@Injectable()
export class ConfiguracaoServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idConfig: number,
    dto: AtualizarConfiguracaoRequestDto,
  ): Promise<ConfiguracaoResponseDto> {
    const db = this.database.getDb();

    const campos = {
      ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
      ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
      ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
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
      // erro é a RLS filtrando — diferencia de "não existe".
      const existe = await db
        .selectFrom('configuracoes')
        .select('id_config')
        .where('id_config', '=', idConfig)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException(`Configuração ${idConfig} não encontrada`);
      }
      throw new ForbiddenException(
        'Sem permissão para editar esta configuração.',
      );
    }

    return ConfiguracaoConverter.paraResponseDto(linha);
  }
}
