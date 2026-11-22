import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';

export interface InstituicaoSugerida {
  nome: string;
  quantidade: number;
}

// Sugestões do campo Instituição (21-11-2026): as que os pesquisadores já digitaram, da mais usada para a menos usada.
// Sem tabela nova: listar_instituicoes_sugeridas() (05) agrupa perfil_pesquisador.vinculo_institucional.
@Injectable()
export class PerfilPesquisadorServiceInstitutions {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<InstituicaoSugerida[]> {
    const resultado = await sql<{ nome: string; quantidade: number }>`
      SELECT nome, quantidade FROM public.listar_instituicoes_sugeridas()`.execute(
      this.database.getDb(),
    );
    return resultado.rows.map((linha) => ({
      nome: linha.nome,
      quantidade: Number(linha.quantidade),
    }));
  }
}
