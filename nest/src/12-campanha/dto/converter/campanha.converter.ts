import { CampanhaEntity } from '../../../commons/database/db.types';
import { CampanhaResponse } from '../response/campanha.response';
import type { ArmazenamentoService } from '../../../commons/storage/storage.service.interface';

// As colunas extras só existem em listar e consultar (campanha.util.with-names.ts); nas
// outras respostas (criar, editar, aprovar...) ficam null.
type CampanhaComExtras = CampanhaEntity & {
  nome_pesquisador?: string | null;
  instituicao_pesquisador?: string | null;
  nome_area?: string | null;
  precisa_revisao_score?: boolean | null;
  imagem_capa_chave?: string | null;
};

export class CampanhaConverter {
  static paraResponseDto(
    entity: CampanhaComExtras,
    armazenamento?: ArmazenamentoService,
  ): CampanhaResponse {
    return {
      idCampanha: entity.id_campanha,
      idUsuario: entity.id_usuario,
      idAdmin: entity.id_admin,
      idAreaConhecimento: entity.id_area_conhecimento,
      titulo: entity.titulo,
      modelo: entity.modelo,
      // DECIMAL vem como string do driver (mesmo cuidado de
      // ScoreConfigTable.peso) - Number() converte pra resposta JSON, sem
      // risco de precisão nesta faixa de valores (crowdfunding acadêmico,
      // não trilhões).
      metaFinanceira: Number(entity.meta_financeira),
      valorBrutoArrecadado: Number(entity.valor_bruto_arrecadado),
      taxaPlataforma:
        entity.taxa_plataforma === null ? null : Number(entity.taxa_plataforma),
      descricao: entity.descricao,
      dataInicio: entity.data_inicio,
      dataFim: entity.data_fim,
      status: entity.status,
      aprovadoEm: entity.aprovado_em,
      enviadoAprovacaoEm: entity.enviado_aprovacao_em,
      encerradoEm: entity.encerrado_em,
      videoApresentacaoUrl: entity.video_apresentacao_url,
      idImagemCapa: entity.id_imagem_capa,
      imagemCapaUrl:
        entity.imagem_capa_chave && armazenamento
          ? armazenamento.montarUrlPublica(entity.imagem_capa_chave)
          : null,
      criadoEm: entity.criado_em,
      nomePesquisador: entity.nome_pesquisador ?? null,
      instituicaoPesquisador: entity.instituicao_pesquisador ?? null,
      nomeArea: entity.nome_area ?? null,
      precisaRevisaoScore: entity.precisa_revisao_score ?? null,
      reenviosRestantes: null,
      prazoReenvioAte: null,
      somenteLeitura: false,
      camposBloqueados: [],
      valorLiquidoEstimado: null,
      nomeAprovador: null,
      nomeEncerrador: null,
      taxaAplicada: null,
    };
  }
}
