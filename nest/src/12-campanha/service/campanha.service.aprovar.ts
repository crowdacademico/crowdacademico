import { Injectable } from '@nestjs/common';
import { distinguir404ou403 } from '../../commons/database/distinguir-404-ou-403.util';
import { DatabaseService } from '../../commons/database/database.service';
import { CAMPANHA_COLUNAS_SELECT } from '../constants/campanha.constants';
import { CampanhaConverter } from '../dto/converter/campanha.converter';
import { CampanhaResponse } from '../dto/response/campanha.response';

// Nenhuma checagem de permissão aqui - quem decide se este UPDATE é
// legítimo é o banco, em duas camadas: pol_campanha_update (04, dono OU
// campanha_aprovar/etc. - deixa a linha passar pela RLS) e
// trg_campanha_valida_transicao (05, [05-K-2] - só quem TEM campanha_
// aprovar sai vivo dessa trigger quando status/aprovado_em mudam; um dono
// sem a permissão passa pela RLS mas a trigger barra com ERRCODE 92001,
// que o PostgresExceptionFilter já traduz). taxa_plataforma é carimbada
// sozinha por trg_campanha_carimba_taxa (05) no instante em que
// aprovado_em deixa de ser NULL - nunca setada por aqui.
// fn_valida_completude_campanha (05) barra aprovação sem orçamento/
// cronograma completos (ERRCODE 90009/90010/90011) e com o prazo já
// vencido (90015).
@Injectable()
export class CampanhaServiceAprovar {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number, idAdmin: number): Promise<CampanhaResponse> {
    const linha = await this.database
      .getDb()
      .updateTable('campanha')
      .set({
        status: 'ativo',
        aprovado_em: new Date(),
        id_admin: idAdmin,
      })
      .where('id_campanha', '=', id)
      .returning(CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      return await distinguir404ou403(
        this.database.getDb(),
        'campanha',
        'id_campanha',
        id,
        'Campanha não encontrada.',
        'Sem permissão para aprovar esta campanha.',
      );
    }

    return CampanhaConverter.paraResponseDto(linha);
  }
}
