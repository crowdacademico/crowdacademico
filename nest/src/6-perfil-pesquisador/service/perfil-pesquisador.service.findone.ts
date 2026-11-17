import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  cpfParaResposta,
  nivelAcessoCpf,
} from '../util/perfil-pesquisador.util.acesso-cpf';
import { DatabaseService } from '../../commons/database/database.service';
import { PERFIL_PESQUISADOR_COLUNAS_SELECT_QUALIFICADAS } from '../constants/perfil-pesquisador.constants';
import { PerfilPesquisadorConverter } from '../dto/converter/perfil-pesquisador.converter';
import { PerfilPesquisadorResponse } from '../dto/response/perfil-pesquisador.response';

@Injectable()
export class PerfilPesquisadorServiceFindOne {
  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  // `idUsuarioAutenticado` vem de request.user.idUsuario - usado só pra
  // decidir se quem pediu é o próprio dono (dono sempre vê o próprio CPF,
  // sem precisar da permissão de sensível, mesma lógica de "ver o próprio
  // e-mail"). pol_perfil_select (04) usa public.usuario_visivel(), não
  // filtra por dono - QUALQUER sessão pode consultar o perfil de QUALQUER
  // pesquisador (perfil de pesquisador é público de propósito, é o que
  // aparece na página de campanha/perfil). O que muda por dono/permissão é
  // só se o CPF cifrado é decifrado na resposta ou vira `null`.
  async executar(
    idUsuarioAlvo: number,
    idUsuarioAutenticado: number | null,
  ): Promise<PerfilPesquisadorResponse> {
    const db = this.database.getDb();

    const linha = await db
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
      .where('perfil_pesquisador.id_usuario', '=', idUsuarioAlvo)
      .executeTakeFirst();

    if (!linha) {
      throw new NotFoundException('Perfil de pesquisador não encontrado.');
    }

    // CPF: completo (dono ou admin), mascarado (quem trabalha com contas) ou oculto (util/perfil-pesquisador.util.acesso-cpf.ts).
    const cpfDecifrado = cpfParaResposta(
      await nivelAcessoCpf(this.database.getDb()),
      idUsuarioAutenticado !== null && idUsuarioAutenticado === idUsuarioAlvo,
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
  }
}
