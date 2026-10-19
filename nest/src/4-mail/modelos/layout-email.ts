// Moldura única de todo e-mail: o mesmo conteúdo sai em HTML (com botão) e em texto puro (para leitor de e-mail sem
// HTML e para filtro de spam, que desconfia de e-mail só com HTML). Cores fixas de propósito: cliente de e-mail não
// lê variável de CSS nem o tema do painel.
export interface ConteudoEmail {
  assunto: string;
  saudacao: string;
  paragrafos: string[];
  botao?: { texto: string; url: string };
  rodape?: string;
}

const RODAPE_PADRAO =
  'Você recebeu este e-mail porque tem uma conta no CrowdAcadêmico. Esta caixa não recebe respostas.';

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function montarTexto(conteudo: ConteudoEmail): string {
  const partes = [conteudo.saudacao, '', ...conteudo.paragrafos];
  if (conteudo.botao) {
    partes.push('', `${conteudo.botao.texto}: ${conteudo.botao.url}`);
  }
  partes.push('', '--', conteudo.rodape ?? RODAPE_PADRAO);
  return partes.join('\n');
}

export function montarHtml(conteudo: ConteudoEmail): string {
  const paragrafos = conteudo.paragrafos
    .map((p) => `<p style="margin:0 0 16px">${escapar(p)}</p>`)
    .join('');
  const botao = conteudo.botao
    ? `<p style="margin:24px 0"><a href="${escapar(conteudo.botao.url)}" style="background:#1d4ed8;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${escapar(conteudo.botao.texto)}</a></p>`
    : '';
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:18px;font-weight:bold;margin:0 0 24px">CrowdAcadêmico</p>
<div style="background:#ffffff;border-radius:8px;padding:24px;font-size:15px;line-height:1.5">
<p style="margin:0 0 16px">${escapar(conteudo.saudacao)}</p>${paragrafos}${botao}
</div>
<p style="font-size:12px;color:#6b7280;margin:16px 0 0">${escapar(conteudo.rodape ?? RODAPE_PADRAO)}</p>
</div></body></html>`;
}
