import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoRequestUpdate } from '../dto/request/termo-uso.request-update';
import { TermoUsoResponse } from '../dto/response/termo-uso.response';

// Alterar SÓ é permitido enquanto NINGUÉM aceitou esta versão específica ainda. Assim que a 1ª pessoa aceitar,
// a versão trava e vira só-leitura para sempre (mesmo raciocínio de TermoUsoServiceCreate: editar depois do
// aceite destruiria o valor probatório de quem já aceitou um texto que deixaria de ser esse). Só `conteudo` é
// editável: `versao`/`tipo` são imutáveis (ver TermoUsoRequestUpdate), então não há UNIQUE de `versao` para
// disparar aqui.
//
// Precisa checar as DUAS tabelas de aceite que referenciam termos_de_uso: usuario_termo (aceite
// no cadastro e no upgrade de pesquisador) E aceite_termo_contribuicao (o termo da conta aceito de novo a cada
// contribuição); um
// termo pode estar "usado" por qualquer uma das duas.
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

    // Uma consulta depois da outra, não Promise.all: é uma conexão só por requisição (paginacao.util.ts).
    const db = this.database.getDb();
    const aceiteGeral = await db
      .selectFrom('usuario_termo')
      .select('id_usuario_termo')
      .where('id_termo', '=', id)
      .executeTakeFirst();
    const aceiteContribuicao = await db
      .selectFrom('aceite_termo_contribuicao')
      .select('id_aceite_contrib')
      .where('id_termo', '=', id)
      .executeTakeFirst();

    if (aceiteGeral || aceiteContribuicao) {
      throw new ConflictException(
        'Esta versão já foi aceita por pelo menos uma pessoa - não pode mais ser editada. Publique uma versão nova.',
      );
    }

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
