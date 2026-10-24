import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { ReembolsoManualResponse } from '../dto/response/pagamento-revisao.response';

interface LinhaReembolso {
  id_contribuicao: number;
  id_campanha: number;
  id_usuario: number | null;
  valor_bruto: string;
  valor_a_devolver: string;
  meio_pagamento: string;
  tentativas: number;
  ultimo_motivo: string | null;
  contribuinte_tem_conta_verificada: boolean;
}

// Contribuições em 'reembolso_manual': o estorno automático desistiu e uma pessoa devolve o dinheiro POR FORA do sistema
// (no painel do provedor ou por Pix). Aqui só se lista e se REGISTRA que foi feito; nada move dinheiro.
@Injectable()
export class PagamentoRevisaoServiceReembolsos {
  constructor(private readonly database: DatabaseService) {}

  async listar(limite = 100): Promise<ReembolsoManualResponse[]> {
    const resultado = await sql<LinhaReembolso>`
      SELECT * FROM public.listar_reembolsos_manuais(${limite}::int)
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      idContribuicao: linha.id_contribuicao,
      idCampanha: linha.id_campanha,
      idUsuario: linha.id_usuario,
      valorBruto: Number(linha.valor_bruto),
      valorADevolver: Number(linha.valor_a_devolver),
      meioPagamento: linha.meio_pagamento,
      tentativas: linha.tentativas,
      ultimoMotivo: linha.ultimo_motivo,
      contribuinteTemContaVerificada: linha.contribuinte_tem_conta_verificada,
    }));
  }

  // reembolso_manual -> devolvido, sempre com o valor inteiro da contribuição. O banco confere o status e o valor.
  async concluir(
    idContribuicao: number,
    valor: number,
    observacao: string,
  ): Promise<void> {
    await sql`
      SELECT public.concluir_reembolso_manual(${idContribuicao}::int, ${valor}::numeric, ${observacao}::text)
    `.execute(this.database.getDb());
  }
}
