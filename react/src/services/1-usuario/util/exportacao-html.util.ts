import { ROTULO_MODELO_CAMPANHA, ROTULO_STATUS_CAMPANHA } from '../../12-campanha/constants/status-campanha.constants';
import { ROTULO_FASE_ATUALIZACAO } from '../../15-atualizacao-campanha/constants/atualizacao-campanha.constants';
import { ROTULO_MEIO_PAGAMENTO } from '../../22-contribuicao/constants/contribuicao.constants';
import { ROTULO_STATUS_CONTRIBUICAO } from '../../22-contribuicao/constants/status-contribuicao.constants';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
} from '../../6-perfil-pesquisador/constants/status-pesquisador.constants';
import { ROTULO_TIPO_TERMO } from '../../5-termo-uso/constants/termo-uso-tipos.constants';
import { formatarData, formatarDataHora, formatarMoeda } from '../../constant/util/formatacao.util';
import type { ExportacaoDados } from '../type/exportacao-dados.type';

// Exportar meus dados em HTML (21-11-2026, LGPD art. 19: "declaração clara e completa"). O JSON continua para a
// portabilidade (art. 18, V); esta é a versão para a pessoa LER: uma página só, que abre em qualquer navegador, sem
// depender do site (o estilo vai dentro do arquivo). Gerada aqui no navegador a partir do mesmo pacote do JSON: uma
// chamada só à API (o limite de uma exportação por hora não muda) e nenhuma biblioteca nova. PDF fica para depois
// (ACHADOS_PARA_DISCUTIR.md).

// Tudo que vem do banco passa por aqui antes de entrar no HTML: texto de usuário nunca vira marcação.
function esc(valor: string | number | null | undefined): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Rótulo em palavras; valor desconhecido (enum novo) aparece como veio, em vez de sumir.
function rotulo(mapa: Record<string, string>, chave: string | null | undefined): string {
  if (chave === null || chave === undefined) return '-';
  return mapa[chave] ?? chave;
}

const simNao = (valor: boolean) => (valor ? 'Sim' : 'Não');

function tabela(cabecalho: string[], linhas: string[][], vazio: string): string {
  if (linhas.length === 0) return `<p class="vazio">${esc(vazio)}</p>`;
  return `<table><thead><tr>${cabecalho.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${linhas
    .map((linha) => `<tr>${linha.map((celula) => `<td>${esc(celula)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

function ficha(campos: [string, string][]): string {
  return `<dl>${campos.map(([nome, valor]) => `<div><dt>${esc(nome)}</dt><dd>${esc(valor)}</dd></div>`).join('')}</dl>`;
}

const ESTILO = `
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1e293b; background: #f8fafc;
         margin: 0; padding: 2rem 1rem; line-height: 1.5; }
  main { max-width: 60rem; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
         padding: 2rem; }
  h1 { margin: 0 0 0.25rem; color: #0f5132; font-size: 1.6rem; }
  h2 { margin: 2rem 0 0.75rem; padding-bottom: 0.25rem; border-bottom: 2px solid #0f9b58; font-size: 1.2rem; }
  h3 { margin: 1.5rem 0 0.5rem; font-size: 1.05rem; }
  h4 { margin: 1rem 0 0.4rem; font-size: 0.95rem; color: #475569; }
  .sub { color: #64748b; margin: 0 0 1rem; }
  .aviso { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 0.5rem; padding: 0.75rem 1rem; font-size: 0.9rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom: 0.5rem; }
  th { text-align: left; background: #f1f5f9; color: #475569; font-size: 0.75rem; text-transform: uppercase; }
  th, td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  dl { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.5rem 1.5rem; margin: 0; }
  dt { font-size: 0.75rem; text-transform: uppercase; color: #64748b; }
  dd { margin: 0; }
  .campanha { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0 1rem 1rem; margin-top: 1rem; }
  .texto { white-space: pre-wrap; }
  .vazio { color: #64748b; font-style: italic; }
  footer { margin-top: 2rem; color: #64748b; font-size: 0.8rem; }
  @media print { body { background: #fff; padding: 0; } main { border: none; } }
`;

export function gerarHtmlExportacao(dados: ExportacaoDados): string {
  const { conta, perfilPesquisador: perfil } = dados;
  const geradoEm = formatarDataHora(dados.geradoEm);
  const partes: string[] = [];

  partes.push(`<h1>Meus dados no CrowdAcadêmico</h1>
    <p class="sub">${esc(conta.nome)} · gerado em ${esc(geradoEm)}</p>
    <p class="aviso">Esta é a cópia dos dados da sua conta, como pede a LGPD (art. 18 e 19). Ela traz só os seus dados:
    quem apoiou as suas campanhas, quem comentou nelas e quem administrou a plataforma ficam de fora, porque são dados
    de outras pessoas. Para levar os dados a outro serviço, use a opção JSON.</p>`);

  partes.push(`<h2>Conta</h2>${ficha([
    ['Nome', conta.nome],
    ['E-mail', conta.email],
    ['E-mail confirmado', simNao(conta.emailVerificado)],
    ['Conta criada em', formatarDataHora(conta.criadoEm)],
    ['Último login', conta.ultimoLoginEm ? formatarDataHora(conta.ultimoLoginEm) : '-'],
  ])}`);

  if (perfil) {
    partes.push(`<h2>Perfil de pesquisador</h2>${ficha([
      ['CPF', perfil.cpfMascarado],
      ['Titulação', rotulo(ROTULO_TITULO_ACADEMICO, perfil.tituloAcademico)],
      ['Vínculo', rotulo(ROTULO_TIPO_VINCULO, perfil.tipoVinculo)],
      ['Instituição', perfil.vinculoInstitucional ?? '-'],
      ['Situação', rotulo(ROTULO_STATUS_PESQUISADOR, perfil.statusPesquisador)],
      ['Ativado em', perfil.ativadoEm ? formatarDataHora(perfil.ativadoEm) : '-'],
      ['Pontuação atual', String(perfil.scoreAtual)],
    ])}`);
    partes.push(`<h3>Links acadêmicos</h3>${tabela(
      ['Tipo', 'Endereço', 'Rótulo'],
      dados.linksAcademicos.map((link) => [link.tipo, link.url, link.rotulo ?? '-']),
      'Nenhum link cadastrado.',
    )}`);
  }

  if (dados.campanhas.length > 0) {
    partes.push('<h2>Minhas campanhas</h2>');
    for (const campanha of dados.campanhas) {
      partes.push(`<section class="campanha"><h3>${esc(campanha.titulo)}</h3>${ficha([
        ['Situação', rotulo(ROTULO_STATUS_CAMPANHA, campanha.status)],
        ['Modelo', rotulo(ROTULO_MODELO_CAMPANHA, campanha.modelo)],
        ['Meta', formatarMoeda(campanha.metaFinanceira)],
        ['Arrecadado', formatarMoeda(campanha.valorBrutoArrecadado)],
        ['Criada em', formatarDataHora(campanha.criadoEm)],
      ])}
      ${campanha.descricao ? `<h4>Descrição</h4><p class="texto">${esc(campanha.descricao)}</p>` : ''}
      <h4>Orçamento</h4>${tabela(
        ['Categoria', 'Descrição', 'Valor'],
        campanha.orcamento.map((item) => [item.categoria, item.descricao ?? '-', formatarMoeda(item.valor)]),
        'Sem itens de orçamento.',
      )}
      <h4>Cronograma</h4>${tabela(
        ['Marco', 'Data prevista'],
        campanha.cronograma.map((marco) => [marco.titulo, formatarData(marco.dataPrevista)]),
        'Sem marcos no cronograma.',
      )}
      <h4>Atualizações publicadas</h4>${tabela(
        ['Título', 'Fase', 'Publicada em', 'Texto'],
        campanha.atualizacoes.map((a) => [a.titulo, rotulo(ROTULO_FASE_ATUALIZACAO, a.fase), formatarDataHora(a.publicadoEm), a.conteudo]),
        'Nenhuma atualização publicada.',
      )}</section>`);
    }
  }

  if (dados.historicoRejeicoes.length > 0) {
    partes.push(`<h2>Campanhas rejeitadas</h2>${tabela(
      ['Campanha', 'Rejeitada em', 'Justificativa'],
      dados.historicoRejeicoes.map((h) => [h.tituloCampanha, formatarDataHora(h.rejeitadoEm), h.justificativa ?? '-']),
      '',
    )}`);
  }

  const nomeCampanha = (titulo: string | null) => titulo ?? 'Campanha indisponível';

  partes.push(`<h2>Contribuições que fiz</h2>${tabela(
    ['Campanha', 'Valor', 'Meio', 'Situação', 'Anônima', 'Data'],
    dados.contribuicoes.map((c) => [
      nomeCampanha(c.tituloCampanha),
      formatarMoeda(c.valor),
      rotulo(ROTULO_MEIO_PAGAMENTO, c.meioPagamento),
      rotulo(ROTULO_STATUS_CONTRIBUICAO, c.status),
      simNao(c.anonima),
      formatarDataHora(c.criadoEm),
    ]),
    'Nenhuma contribuição.',
  )}`);

  partes.push(`<h2>Comentários que escrevi</h2>${tabela(
    ['Campanha', 'Comentário', 'Endossado', 'Data'],
    dados.comentariosEscritos.map((c) => [nomeCampanha(c.tituloCampanha), c.conteudo, simNao(c.endossado), formatarDataHora(c.criadoEm)]),
    'Nenhum comentário.',
  )}`);

  partes.push(`<h2>Campanhas que sigo</h2>${tabela(
    ['Campanha', 'Desde'],
    dados.seguindoCampanhas.map((s) => [nomeCampanha(s.tituloCampanha), formatarDataHora(s.seguidoEm)]),
    'Você não segue campanhas.',
  )}`);

  partes.push(`<h2>Pesquisadores que sigo</h2>${tabela(
    ['Pesquisador', 'Desde'],
    dados.seguindoPesquisadores.map((s) => [s.nomePesquisador ?? 'Pesquisador indisponível', formatarDataHora(s.seguidoEm)]),
    'Você não segue pesquisadores.',
  )}`);

  partes.push(`<h2>Termos que aceitei</h2>${tabela(
    ['Termo', 'Versão', 'Aceito em'],
    dados.aceitesTermos.map((a) => [rotulo(ROTULO_TIPO_TERMO, a.tipoTermo), a.versao ?? '-', formatarDataHora(a.aceitoEm)]),
    'Nenhum aceite registrado.',
  )}`);

  // Prazo de guarda (21-11-2026): só os logins que a limpeza diária ainda não apagou.
  const prazoAcessos =
    dados.sessoesRetencaoDias > 0
      ? `<p class="sub">Os logins ficam guardados por ${dados.sessoesRetencaoDias} dias (o prazo de registro de acesso do Marco Civil da Internet); os mais antigos são apagados automaticamente.</p>`
      : '';
  partes.push(`<h2>Acessos (logins)</h2>${prazoAcessos}${tabela(
    ['Data', 'IP'],
    dados.sessoes.map((s) => [formatarDataHora(s.logadoEm), s.ip ?? '-']),
    'Nenhum login registrado.',
  )}`);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meus dados - CrowdAcadêmico</title>
<style>${ESTILO}</style>
</head>
<body><main>${partes.join('\n')}
<footer>CrowdAcadêmico · arquivo gerado em ${esc(geradoEm)}. Para salvar em PDF, use Imprimir → Salvar como PDF no navegador.</footer>
</main></body>
</html>`;
}
