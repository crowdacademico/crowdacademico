import { PerfilPesquisadorEntity } from '../../entity/perfil-pesquisador.entity';
import { PerfilPesquisadorResponse } from '../response/perfil-pesquisador.response';

type PerfilPesquisadorParaConverter = Pick<
  PerfilPesquisadorEntity,
  | 'id_usuario'
  | 'tipo_vinculo'
  | 'vinculo_institucional'
  | 'titulo_academico'
  | 'status_pesquisador'
  | 'ativado_em'
  | 'score_atual'
  | 'score_atualizado_em'
>;

export class PerfilPesquisadorConverter {
  // `cpfDecifrado`: parâmetro separado, nunca lido de dentro da entity —
  // decidir SE decifra (checar perfil_pesquisador_visualizar_sensivel) é
  // responsabilidade do service, não deste converter. `null` aqui sempre
  // vira `cpf: null` na resposta, nunca lança nem esconde o campo.
  static paraResponseDto(
    entity: PerfilPesquisadorParaConverter,
    cpfDecifrado: string | null,
  ): PerfilPesquisadorResponse {
    return {
      idUsuario: entity.id_usuario,
      cpf: cpfDecifrado,
      tipoVinculo: entity.tipo_vinculo,
      vinculoInstitucional: entity.vinculo_institucional,
      tituloAcademico: entity.titulo_academico,
      statusPesquisador: entity.status_pesquisador,
      ativadoEm: entity.ativado_em,
      scoreAtual: entity.score_atual,
      scoreAtualizadoEm: entity.score_atualizado_em,
    };
  }
}
