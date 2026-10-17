import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ContaRecebimentoConverter } from '../dto/converter/conta-recebimento.converter';
import { ContaRecebimentoResponse } from '../dto/response/conta-recebimento.response';

// GET /conta-recebimento: a chave Pix do próprio pesquisador, mascarada. null = sem chave (ou sem perfil).
@Injectable()
export class ContaRecebimentoServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<ContaRecebimentoResponse | null> {
    const linha = await this.database
      .getDb()
      .selectFrom('perfil_pesquisador')
      .select([
        'tipo_chave_pix',
        'chave_pix_criptografada',
        'chave_pix_verificada_em',
      ])
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();
    return linha ? ContaRecebimentoConverter.paraResponseDto(linha) : null;
  }
}
