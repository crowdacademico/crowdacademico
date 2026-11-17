import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import { Inject, Injectable } from '@nestjs/common';
import {
  cpfParaResposta,
  nivelAcessoCpf,
} from '../util/perfil-pesquisador.util.acesso-cpf';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ResultadoPaginado,
  paginar,
} from '../../commons/database/paginacao.util';
import { PERFIL_PESQUISADOR_COLUNAS_SELECT_QUALIFICADAS } from '../constants/perfil-pesquisador.constants';
import { PerfilPesquisadorConverter } from '../dto/converter/perfil-pesquisador.converter';
import { PerfilPesquisadorRequestList } from '../dto/request/perfil-pesquisador.request-list';
import { PerfilPesquisadorResponse } from '../dto/response/perfil-pesquisador.response';

// pol_perfil_select (04) é pública (usuario_visivel()) - lista TODOS os
// pesquisadores, não só de quem está logado, mesmo espírito de
// PerfilPesquisadorServiceFindOne (o perfil é público de propósito). O
// que muda por permissão é só se o CPF vem decifrado ou `null` - mas
// aqui, diferente do findone, "é o próprio dono" varia LINHA A LINHA (uma
// lista tem N pesquisadores diferentes); `temPermissaoSensivel` é
// calculado UMA VEZ (mesmo requerente, mesma permissão em toda a
// resposta), e combinado por linha com `linha.id_usuario ===
// idUsuarioAutenticado`.
@Injectable()
export class PerfilPesquisadorServiceFindAll {
  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async executar(
    filtro: PerfilPesquisadorRequestList,
    idUsuarioAutenticado: number | null,
  ): Promise<ResultadoPaginado<PerfilPesquisadorResponse>> {
    const db = this.database.getDb();

    let query = db
      .selectFrom('perfil_pesquisador')
      .leftJoin(
        'usuario',
        'usuario.id_usuario',
        'perfil_pesquisador.id_usuario',
      )
      .leftJoin('arquivo as foto', (join) =>
        join
          .onRef('foto.id_arquivo', '=', 'usuario.id_imagem_perfil')
          .on('foto.ativo', '=', true),
      )
      .select(PERFIL_PESQUISADOR_COLUNAS_SELECT_QUALIFICADAS)
      .select(['usuario.nome as nome', 'foto.chave as foto_chave'])
      .orderBy('perfil_pesquisador.id_usuario');

    if (filtro.statusPesquisador !== undefined) {
      query = query.where(
        'perfil_pesquisador.status_pesquisador',
        '=',
        filtro.statusPesquisador,
      );
    }
    if (filtro.tipoVinculo !== undefined) {
      query = query.where(
        'perfil_pesquisador.tipo_vinculo',
        '=',
        filtro.tipoVinculo,
      );
    }

    // SEQUENCIAL, não Promise.all (mesmo motivo de paginacao.util.ts): uma conexão só por requisição, sem ganho
    // real de paralelismo e gerando o warning de depreciação do driver `pg`.
    const resultado = await paginar(query, {
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
    });
    // CPF: completo, mascarado ou oculto conforme a conta logada (util/perfil-pesquisador.util.acesso-cpf.ts).
    const nivelCpf = await nivelAcessoCpf(this.database.getDb());

    return {
      ...resultado,
      dados: resultado.dados.map((linha) => {
        const cpfDecifrado = cpfParaResposta(
          nivelCpf,
          linha.id_usuario === idUsuarioAutenticado,
          linha.cpf_criptografado,
        );
        return PerfilPesquisadorConverter.paraResponseDto(
          linha,
          cpfDecifrado,
          linha.nome,
          linha.foto_chave
            ? this.armazenamento.montarUrlPublica(linha.foto_chave)
            : null,
        );
      }),
    };
  }
}
