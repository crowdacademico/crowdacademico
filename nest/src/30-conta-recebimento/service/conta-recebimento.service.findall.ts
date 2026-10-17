import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { RepasseResponse } from '../dto/response/repasse.response';

// GET /conta-recebimento/repasses: os repasses das campanhas do próprio pesquisador, do mais novo ao mais antigo.
// pol_repasse_select (04) já só mostra a ele os das campanhas dele; o filtro por dono aqui é o mesmo recorte, explícito.
@Injectable()
export class ContaRecebimentoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<RepasseResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('repasse')
      .innerJoin('campanha', 'campanha.id_campanha', 'repasse.id_campanha')
      .select([
        'repasse.id_repasse',
        'repasse.id_campanha',
        'campanha.titulo',
        'repasse.valor_bruto',
        'repasse.valor_liquido',
        'repasse.taxa_relativa',
        'repasse.status',
        'repasse.repassado_em',
      ])
      .where('campanha.id_usuario', '=', idUsuario)
      .orderBy('repasse.id_repasse', 'desc')
      .execute();
    return linhas.map((linha) => ({
      idRepasse: linha.id_repasse,
      idCampanha: linha.id_campanha,
      tituloCampanha: linha.titulo,
      valorBruto: Number(linha.valor_bruto),
      valorLiquido: Number(linha.valor_liquido),
      taxaPlataforma:
        linha.taxa_relativa === null ? null : Number(linha.taxa_relativa),
      status: linha.status,
      repassadoEm: linha.repassado_em,
    }));
  }
}
