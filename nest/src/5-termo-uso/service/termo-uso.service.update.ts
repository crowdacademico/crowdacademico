import { BadRequestException, Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoRequestUpdate } from '../dto/request/termo-uso.request-update';
import { TermoUsoResponse } from '../dto/response/termo-uso.response';

// Alterar SÓ é permitido enquanto NINGUÉM aceitou esta versão específica ainda (RF-091): editar depois do aceite
// destruiria o valor probatório de quem já aceitou um texto que deixaria de ser esse. Quem recusa é o banco
// (fn_protege_termo_aceito, 91033 -> 409), olhando as duas tabelas de aceite (usuario_termo e
// aceite_termo_contribuicao). Só `conteudo` é editável: `versao`/`tipo` são imutáveis (TermoUsoRequestUpdate).
@Injectable()
export class TermoUsoServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    id: number,
    dto: TermoUsoRequestUpdate,
  ): Promise<TermoUsoResponse> {
    if (dto.conteudo === undefined) {
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const db = this.database.getDb();
    const linha = await db
      .updateTable('termos_de_uso')
      .set({ conteudo: dto.conteudo })
      .where('id_termo', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!linha) {
      // pol_termos_select é USING(true) - uma 2ª consulta aqui sempre
      // enxerga a linha se ela existir de verdade, então distingue "não
      // existe" (404) de "existe, mas pol_termos_update bloqueou por
      // falta de 'termos_uso_gerenciar'" (403) - mesmo padrão de
      // campanha.service.reject.ts.
      return await distinguir404ou403(
        this.database.getDb(),
        'termos_de_uso',
        { id_termo: id },
        'Versão do Termo de Uso não encontrada.',
        "Sem permissão 'termos_uso_gerenciar' para alterar esta versão.",
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
