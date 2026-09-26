import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoResponse } from '../dto/response/termo-uso.response';

// Buscar uma versão específica por id: a tela de Alterar precisa carregar os dados atuais antes de editar
// (mesmo padrão de qualquer outro "Consultar/Alterar" do painel).
@Injectable()
export class TermoUsoServiceBuscar {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<TermoUsoResponse> {
    const linha = await this.database
      .getDb()
      .selectFrom('termos_de_uso')
      .select(['id_termo', 'tipo', 'versao', 'conteudo', 'ativo', 'criado_em'])
      .where('id_termo', '=', id)
      .executeTakeFirst();

    if (!linha) {
      throw new NotFoundException(
        `Versão de Termos de Uso ${id} não encontrada.`,
      );
    }

    return {
      idTermo: linha.id_termo,
      tipo: linha.tipo,
      versao: linha.versao,
      conteudo: linha.conteudo,
      ativo: linha.ativo,
      criadoEm: linha.criado_em,
    };
  }
}
