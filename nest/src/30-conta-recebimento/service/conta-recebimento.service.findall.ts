import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CONTA_RECEBIMENTO_COLUNAS_SELECT } from '../constants/conta-recebimento.constants';
import { ContaRecebimentoConverter } from '../dto/converter/conta-recebimento.converter';
import { ContaRecebimentoResponse } from '../dto/response/conta-recebimento.response';

// pol_conta_recebimento_select (04): a pessoa só vê as próprias contas (quem tem repasse_aprovar vê todas, mas esta rota
// sempre filtra por quem está autenticado).
@Injectable()
export class ContaRecebimentoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<ContaRecebimentoResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('conta_recebimento_usuario')
      .select(CONTA_RECEBIMENTO_COLUNAS_SELECT)
      .where('id_usuario', '=', idUsuario)
      .orderBy('ativa', 'desc')
      .orderBy('criada_em', 'desc')
      .execute();
    return linhas.map((linha) =>
      ContaRecebimentoConverter.paraResponseDto(linha),
    );
  }
}
