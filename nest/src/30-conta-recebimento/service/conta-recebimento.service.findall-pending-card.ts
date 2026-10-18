import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { CartaoALiberarResponse } from '../dto/response/cartao-a-liberar.response';

interface LinhaCartaoALiberar {
  id_campanha: number;
  titulo_campanha: string;
  valor: string;
  previsto_para: Date;
}

// GET /conta-recebimento/cartao-a-liberar: o dinheiro de cartão das campanhas do próprio pesquisador que ainda espera o
// provedor liberar. cartao_a_liberar() (05) é SECURITY DEFINER e usa o usuário da sessão: o pesquisador não lê as
// contribuições de outras pessoas, só recebe a soma por campanha.
@Injectable()
export class ContaRecebimentoServiceFindAllPendingCard {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<CartaoALiberarResponse[]> {
    const resultado = await sql<LinhaCartaoALiberar>`
      SELECT * FROM public.cartao_a_liberar()`.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idCampanha: linha.id_campanha,
      tituloCampanha: linha.titulo_campanha,
      valor: Number(linha.valor),
      previstoPara: linha.previsto_para,
    }));
  }
}
