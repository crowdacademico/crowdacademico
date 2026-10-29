import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';

export type CanalNotificacao = 'email' | 'interna';

export interface RegraNotificacao {
  id_regra_notificacao: number;
  tipo_evento: string;
  canal: CanalNotificacao;
  ativo: boolean;
  obrigatoria: boolean;
  id_modelo_mensagem: number;
  criado_em: string;
  atualizado_em: string;
}

export interface ModeloMensagem {
  id_modelo_mensagem: number;
  tipo_evento: string;
  canal: CanalNotificacao;
  idioma: string;
  titulo_template: string;
  corpo_texto_template: string;
  corpo_html_template: string | null;
  versao: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ConfiguracaoNotificacoesResponse {
  regras: RegraNotificacao[];
  modelos: ModeloMensagem[];
}

export interface NovaVersaoModelo {
  titulo_template: string;
  corpo_texto_template: string;
  corpo_html_template?: string | null;
}

export const notificacaoConfiguracaoApi = {
  listar: (authFetch: AuthFetch): Promise<ConfiguracaoNotificacoesResponse> =>
    authFetch('/notificacoes/configuracao').then(
      tratarResposta<ConfiguracaoNotificacoesResponse>,
    ),

  atualizarRegra: (
    authFetch: AuthFetch,
    idRegra: number,
    ativo: boolean,
  ): Promise<RegraNotificacao> =>
    authFetch(`/notificacoes/configuracao/regras/${idRegra}`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo }),
    }).then(tratarResposta<RegraNotificacao>),

  criarVersao: (
    authFetch: AuthFetch,
    idModelo: number,
    dados: NovaVersaoModelo,
  ): Promise<ModeloMensagem> =>
    authFetch(`/notificacoes/configuracao/modelos/${idModelo}/versoes`, {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<ModeloMensagem>),
};