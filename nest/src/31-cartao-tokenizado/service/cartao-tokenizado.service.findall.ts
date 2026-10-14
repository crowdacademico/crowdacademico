import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CARTAO_TOKENIZADO_COLUNAS_SELECT } from '../constants/cartao-tokenizado.constants';
import { CartaoTokenizadoConverter } from '../dto/converter/cartao-tokenizado.converter';
import { CartaoTokenizadoResponse } from '../dto/response/cartao-tokenizado.response';

// pol_cartao_tokenizado_select (04) é estritamente do dono: cada pessoa só vê os próprios cartões. Só os ativos.
@Injectable()
export class CartaoTokenizadoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<CartaoTokenizadoResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('cartao_tokenizado_usuario')
      .select(CARTAO_TOKENIZADO_COLUNAS_SELECT)
      .where('id_usuario', '=', idUsuario)
      .where('ativo', '=', true)
      .orderBy('criado_em', 'desc')
      .execute();
    return linhas.map((linha) =>
      CartaoTokenizadoConverter.paraResponseDto(linha),
    );
  }
}
