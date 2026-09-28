import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoResponse } from '../dto/response/termo-uso.response';

// Todas as versões, por id crescente (mesmo padrão de ordenação de
// configuracao.service.findall.ts/area-conhecimento.service.findall.ts/tipo-link.service.findall.ts: por id,
// não por data). pol_termos_select é USING(true), não filtra nada: a tela de admin é quem decide o que mostrar;
// o guard de autenticação fica no controller.
//
// Lista todos os tipos juntos, misturados na mesma tabela (`tipo` é coluna visível): quem quiser só 1 tipo por
// vez usa `termoUsoApi.buscarAtivo(tipo)` (card do dashboard), não esta listagem.
@Injectable()
export class TermoUsoServiceListar {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<TermoUsoResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('termos_de_uso')
      .select(['id_termo', 'tipo', 'versao', 'conteudo', 'ativo', 'criado_em'])
      .orderBy('id_termo')
      .execute();

    return linhas.map((linha) => ({
      idTermo: linha.id_termo,
      tipo: linha.tipo,
      versao: linha.versao,
      conteudo: linha.conteudo,
      ativo: linha.ativo,
      criadoEm: linha.criado_em,
    }));
  }
}
