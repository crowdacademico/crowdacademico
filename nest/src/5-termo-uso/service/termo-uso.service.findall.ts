import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoResponse } from '../dto/response/termo-uso.response';

// Todas as versões, por id crescente (mesmo padrão de ordenação de
// configuracoes.service.findall.ts/area-conhecimento.service.findall.ts/tipo-link.service.findall.ts: por id,
// não por data). pol_termos_select é USING(true), não filtra nada: a tela de admin é quem decide o que mostrar;
// o guard de autenticação fica no controller.
//
// Lista todos os tipos juntos, misturados na mesma tabela (`tipo` é coluna visível): quem quiser só 1 tipo por
// vez usa `termoUsoApi.buscarAtivo(tipo)` (card do dashboard), não esta listagem.
@Injectable()
export class TermoUsoServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<TermoUsoResponse[]> {
    const db = this.database.getDb();
    const linhas = await db
      .selectFrom('termos_de_uso')
      .select(['id_termo', 'tipo', 'versao', 'conteudo', 'ativo', 'criado_em'])
      .orderBy('id_termo')
      .execute();
    const aceites = await this.contarAceites();

    return linhas.map((linha) => ({
      idTermo: linha.id_termo,
      tipo: linha.tipo,
      versao: linha.versao,
      conteudo: linha.conteudo,
      ativo: linha.ativo,
      criadoEm: linha.criado_em,
      aceites: aceites.get(linha.id_termo),
    }));
  }

  // Quantos aceites cada versão tem (contar_aceites_termo, 03): a tela decide por ela se a versão ainda pode ser
  // editada ou excluída.
  private async contarAceites(): Promise<Map<number, number>> {
    const resultado = await sql<{ id_termo: number; aceites: number }>`
      SELECT id_termo, public.contar_aceites_termo(id_termo) AS aceites FROM termos_de_uso`.execute(
      this.database.getDb(),
    );
    return new Map(
      resultado.rows.map((linha) => [linha.id_termo, linha.aceites]),
    );
  }
}
