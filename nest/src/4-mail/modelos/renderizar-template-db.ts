import { decifrarSegredoEmail } from '../../commons/seguranca/segredo-email-cifra.util';
import { CHAVE_SEGREDO_NOTIFICACAO, TIPO_NOTIFICACAO } from '../../27-notificacao/constants/notificacao.constants';

export interface ModeloEmailBanco {
  titulo_template: string; // no e-mail, o assunto
  corpo_texto_template: string;
  corpo_html_template: string | null;
}

export interface ConteudoEmailBanco {
  assunto: string;
  texto: string;
  html: string;
}

const escaparHtml = (valor: string): string => valor
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const valorTemplate = (chave: string, valor: unknown): string => {
  if (valor === null || valor === undefined) return '';
  if (chave === 'valor') {
    const numero = Number(valor);
    if (Number.isFinite(numero)) return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  if (['data_prevista', 'prazo_reenvio_ate', 'suspenso_ate'].includes(chave)) {
    const data = new Date(String(valor));
    if (!Number.isNaN(data.getTime())) return data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  return '';
};

export function renderizarVariaveis(template: string, dados: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, chave: string) => valorTemplate(chave, dados[chave]));
}

function urlPainelSeguro(urlPainel: string | undefined): string {
  if (!urlPainel?.trim()) {
    throw new Error('PAINEL_URL precisa estar configurada para gerar links de verificação e recuperação.');
  }
  let url: URL;
  try {
    url = new URL(urlPainel);
  } catch {
    throw new Error('PAINEL_URL não contém uma URL válida.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('PAINEL_URL deve usar HTTP/HTTPS e não pode conter credenciais.');
  }
  return urlPainel.replace(/\/+$/, '');
}

export function montarEmailDoBanco(
  modelo: ModeloEmailBanco,
  tipoEvento: string,
  dadosOriginais: Record<string, unknown>,
  urlPainel?: string,
): ConteudoEmailBanco {
  const dados = { ...dadosOriginais };
  const segredoCifrado = dados[CHAVE_SEGREDO_NOTIFICACAO];
  let segredo: string | null = null;
  if (typeof segredoCifrado === 'string' && segredoCifrado.length > 0) {
    try {
      segredo = decifrarSegredoEmail(segredoCifrado);
    } catch {
      segredo = null;
    }
  }

  if (tipoEvento === TIPO_NOTIFICACAO.verificacaoEmail) {
    if (!segredo) throw new Error('O link de verificação não está disponível. Solicite um novo e-mail de verificação.');
    const base = urlPainelSeguro(urlPainel);
    dados.url_confirmacao = `${base}/verificar-email?token=${encodeURIComponent(segredo)}`;
  } else if (tipoEvento === TIPO_NOTIFICACAO.recuperacaoSenha) {
    if (!segredo) throw new Error('O link de recuperação não está disponível. Solicite uma nova recuperação de senha.');
    const base = urlPainelSeguro(urlPainel);
    dados.url_recuperacao = `${base}/redefinir-senha?token=${encodeURIComponent(segredo)}`;
    dados.minutos = Number(dados.minutos) > 0 ? Number(dados.minutos) : 30;
  }

  // O segredo cifrado serve só para montar o link acima; um {{segredo}} num modelo nunca pode imprimi-lo.
  delete dados[CHAVE_SEGREDO_NOTIFICACAO];

  const assunto = renderizarVariaveis(modelo.titulo_template, dados).replace(/[\r\n]+/g, ' ').trim();
  const texto = renderizarVariaveis(modelo.corpo_texto_template, dados).trim();
  if (!assunto || !texto) throw new Error('O modelo de e-mail está sem assunto ou conteúdo após substituir as variáveis.');

  const htmlDoModelo = modelo.corpo_html_template?.trim()
    ? renderizarVariaveis(modelo.corpo_html_template, Object.fromEntries(Object.entries(dados).map(([chave, valor]) => [chave, escaparHtml(valorTemplate(chave, valor))])))
    : texto.split(/\n{1,}/).map((linha) => `<p style="margin:0 0 16px">${escaparHtml(linha)}</p>`).join('');
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937"><div style="max-width:560px;margin:0 auto;padding:24px"><p style="font-size:18px;font-weight:bold;margin:0 0 24px">CrowdAcadêmico</p><div style="background:#ffffff;border-radius:8px;padding:24px;font-size:15px;line-height:1.5">${htmlDoModelo}</div><p style="font-size:12px;color:#6b7280;margin:16px 0 0">Você recebeu este e-mail porque tem uma conta no CrowdAcadêmico. Esta caixa não recebe respostas.</p></div></body></html>`;
  return { assunto, texto, html };
}
