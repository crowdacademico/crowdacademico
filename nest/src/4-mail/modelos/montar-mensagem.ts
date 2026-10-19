import { decifrarSegredoEmail } from '../../commons/seguranca/segredo-email-cifra.util';
import { CHAVE_SEGREDO_NOTIFICACAO } from '../../27-notificacao/constants/notificacao.constants';
import { montarHtml, montarTexto } from './layout-email';
import { montarConteudo } from './modelos-email';

export const URL_PAINEL_PADRAO = 'http://localhost:5173';

export interface MensagemMontada {
  assunto: string;
  texto: string;
  html: string;
}

// O e-mail de uma linha de `notificacao`, pronto para enviar: o mesmo que o worker manda e que a T6 mostra. O link com
// token (dados.segredo) só é decifrado aqui, na hora; null = tipo sem modelo, ou um e-mail que precisa do link e não
// tem mais (o link é apagado quando o e-mail sai).
export function montarMensagem(
  tipo: string,
  dados: Record<string, unknown>,
  urlPainel: string | undefined,
): MensagemMontada | null {
  const conteudo = montarConteudo(tipo, {
    dados,
    urlPainel: (urlPainel ?? URL_PAINEL_PADRAO).replace(/\/+$/, ''),
    segredo: decifrar(dados[CHAVE_SEGREDO_NOTIFICACAO]),
  });
  if (!conteudo) return null;
  return {
    assunto: conteudo.assunto,
    texto: montarTexto(conteudo),
    html: montarHtml(conteudo),
  };
}

function decifrar(valor: unknown): string | null {
  if (typeof valor !== 'string' || valor === '') return null;
  try {
    return decifrarSegredoEmail(valor);
  } catch {
    return null;
  }
}
