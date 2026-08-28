import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import { ArquivoConverter } from '../dto/converter/arquivo.converter';
import { ArquivoResponse } from '../dto/response/arquivo.response';

@Injectable()
export class ArquivoServiceFindOne {
  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async executar(idArquivo: number): Promise<ArquivoResponse> {
    // pol_arquivo_select (04_rls_policies.sql) é USING(TRUE) — leitura de
    // arquivo é sempre pública, nenhum arquivo do sistema é secreto (ver
    // doc de arquitetura). Devolve mesmo se `ativo=false`: quem consome
    // decide o que fazer com um arquivo desativado, a API não esconde.
    const linha = await this.database
      .getDb()
      .selectFrom('arquivo')
      .selectAll()
      .where('id_arquivo', '=', idArquivo)
      .executeTakeFirst();

    if (!linha) {
      throw new NotFoundException(`Arquivo ${idArquivo} não encontrado`);
    }

    return ArquivoConverter.paraResponseDto(linha, this.armazenamento);
  }
}
