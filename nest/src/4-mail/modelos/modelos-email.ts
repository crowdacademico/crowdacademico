import { TIPO_NOTIFICACAO } from '../../27-notificacao/constants/notificacao.constants';
import {
  montarParagrafos,
  montarTexto,
  primeiroNome,
} from '../../27-notificacao/util/montar-texto-modelo';
import type { ConteudoEmail } from './layout-email';

// O texto de cada e-mail vem de modelo_mensagem (o admin edita no painel); aqui fica só o que não é texto: a saudação
// e o botão de cada tipo. Os dados vêm de notificacao.dados, gravados por quem enfileirou (gatilhos de [05-Q], ou o
// Nest no cadastro e na recuperação de senha).
export interface ContextoModelo {
  dados: Record<string, unknown>;
  // Endereço do painel (PAINEL_URL), para os links.
  urlPainel: string;
  // O token do link, já decifrado (só verificação de conta e recuperação de senha).
  segredo: string | null;
}

export interface ModeloEmail {
  titulo: string;
  corpo: string;
}

type Botao = NonNullable<ConteudoEmail['botao']>;

const entrar = ({ urlPainel }: ContextoModelo): Botao => ({
  texto: 'Entrar no CrowdAcadêmico',
  url: `${urlPainel}/login`,
});

// Botão de cada tipo; sem entrada, o e-mail sai sem botão. null = o tipo exige o link com token e ele não existe mais.
const BOTOES: Partial<
  Record<string, (contexto: ContextoModelo) => Botao | null>
> = {
  [TIPO_NOTIFICACAO.verificacaoEmail]: ({ urlPainel, segredo }) =>
    segredo
      ? {
          texto: 'Confirmar meu e-mail',
          url: `${urlPainel}/verificar-email?token=${encodeURIComponent(segredo)}`,
        }
      : null,
  [TIPO_NOTIFICACAO.recuperacaoSenha]: ({ urlPainel, segredo }) =>
    segredo
      ? {
          texto: 'Criar nova senha',
          url: `${urlPainel}/redefinir-senha?token=${encodeURIComponent(segredo)}`,
        }
      : null,
  [TIPO_NOTIFICACAO.campanhaAprovada]: entrar,
  [TIPO_NOTIFICACAO.campanhaRejeitada]: entrar,
  [TIPO_NOTIFICACAO.novaCampanhaPesquisador]: entrar,
  [TIPO_NOTIFICACAO.novaAtualizacao]: entrar,
  [TIPO_NOTIFICACAO.repassePrevisto]: entrar,
  [TIPO_NOTIFICACAO.encerramentoAprovado]: entrar,
  [TIPO_NOTIFICACAO.encerramentoRejeitado]: entrar,
  [TIPO_NOTIFICACAO.pesquisadorReativado]: entrar,
};

// null = sem o link que o tipo exige: o worker marca o e-mail como falha não recuperável.
export function montarConteudo(
  tipo: string,
  modelo: ModeloEmail,
  contexto: ContextoModelo,
): ConteudoEmail | null {
  const botao = BOTOES[tipo]?.(contexto);
  if (botao === null) return null;
  const nome = primeiroNome(contexto.dados);
  return {
    assunto: montarTexto(modelo.titulo, contexto.dados)
      .replace(/\s+/g, ' ')
      .trim(),
    saudacao: nome ? `Olá, ${nome}!` : 'Olá!',
    paragrafos: montarParagrafos(modelo.corpo, contexto.dados),
    botao,
  };
}
