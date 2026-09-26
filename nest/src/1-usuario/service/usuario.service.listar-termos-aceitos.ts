import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { UsuarioResponseTermoAceito } from '../dto/response/usuario.response-termo-aceito';

// "Onde fica registrado" o aceite do Termo de Uso, para Consultar Usuário: join simples de usuario_termo com
// termos_de_uso (para mostrar versão/tipo, não só o id_termo cru).
//
// SÓ usuario_termo aqui (cadastro E upgrade de perfil de pesquisador, as 2 trilhas que gravam nessa tabela).
// aceite_termo_contribuicao fica de fora de propósito: é por CONTRIBUIÇÃO, não por usuário direto, e o módulo
// de contribuição (22-contribuicao) ainda não existe; juntar isso aqui exigiria um join a mais por uma tabela
// que ainda não tem linha no sistema. Próximo passo natural quando esse módulo nascer.
@Injectable()
export class UsuarioServiceListarTermosAceitos {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<UsuarioResponseTermoAceito[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('usuario_termo')
      .innerJoin(
        'termos_de_uso',
        'termos_de_uso.id_termo',
        'usuario_termo.id_termo',
      )
      .select([
        'termos_de_uso.tipo',
        'termos_de_uso.versao',
        'usuario_termo.aceito_em',
      ])
      .where('usuario_termo.id_usuario', '=', idUsuario)
      .orderBy('usuario_termo.aceito_em', 'desc')
      .execute();

    return linhas.map((linha) => ({
      tipo: linha.tipo,
      versao: linha.versao,
      aceitoEm: linha.aceito_em,
    }));
  }
}
