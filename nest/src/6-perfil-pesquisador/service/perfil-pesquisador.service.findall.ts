import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { decifrarCpf } from '../../commons/seguranca/cpf-cifra.util';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { PERFIL_PESQUISADOR_COLUNAS_SELECT } from '../constants/perfil-pesquisador.constants';
import { PerfilPesquisadorConverter } from '../dto/converter/perfil-pesquisador.converter';
import { PerfilPesquisadorRequestList } from '../dto/request/perfil-pesquisador.request-list';
import { PerfilPesquisadorResponse } from '../dto/response/perfil-pesquisador.response';

// pol_perfil_select (04) é pública (usuario_visivel()) — lista TODOS os
// pesquisadores, não só de quem está logado, mesmo espírito de
// PerfilPesquisadorServiceFindOne (o perfil é público de propósito). O
// que muda por permissão é só se o CPF vem decifrado ou `null` — mas
// aqui, diferente do findone, "é o próprio dono" varia LINHA A LINHA (uma
// lista tem N pesquisadores diferentes); `temPermissaoSensivel` é
// calculado UMA VEZ (mesmo requerente, mesma permissão em toda a
// resposta), e combinado por linha com `linha.id_usuario ===
// idUsuarioAutenticado`.
@Injectable()
export class PerfilPesquisadorServiceFindAll {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: PerfilPesquisadorRequestList,
    idUsuarioAutenticado: number | null,
  ): Promise<ResultadoPaginado<PerfilPesquisadorResponse>> {
    const db = this.database.getDb();

    let query = db
      .selectFrom('perfil_pesquisador')
      .select(PERFIL_PESQUISADOR_COLUNAS_SELECT)
      .orderBy('id_usuario');

    if (filtro.statusPesquisador !== undefined) {
      query = query.where('status_pesquisador', '=', filtro.statusPesquisador);
    }
    if (filtro.tipoVinculo !== undefined) {
      query = query.where('tipo_vinculo', '=', filtro.tipoVinculo);
    }

    const [resultado, temPermissaoSensivel] = await Promise.all([
      paginar(query, { pagina: filtro.pagina, tamanho: filtro.tamanho }),
      this.temPermissaoSensivel(),
    ]);

    return {
      ...resultado,
      dados: resultado.dados.map((linha) => {
        const podeVer =
          temPermissaoSensivel || linha.id_usuario === idUsuarioAutenticado;
        const cpfDecifrado = podeVer
          ? decifrarCpf(linha.cpf_criptografado)
          : null;
        return PerfilPesquisadorConverter.paraResponseDto(linha, cpfDecifrado);
      }),
    };
  }

  private async temPermissaoSensivel(): Promise<boolean> {
    const resultado = await sql<{
      tem_permissao: boolean;
    }>`SELECT public.tem_permissao('perfil_pesquisador_visualizar_sensivel') AS tem_permissao`.execute(
      this.database.getDb(),
    );
    return resultado.rows[0]?.tem_permissao ?? false;
  }
}
