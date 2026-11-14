import { Controller, Get, Header, Param, ParseIntPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Publico } from '../../commons/auth/publico.decorator';
import { CampanhaServiceFindOne } from '../service/campanha.service.findone';

const TAMANHO_DESCRICAO = 200;

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resumir(texto: string | null): string {
  const limpo = (texto ?? '').replace(/\s+/g, ' ').trim();
  if (!limpo) return 'Apoie esta pesquisa no CrowdAcadêmico.';
  return limpo.length > TAMANHO_DESCRICAO
    ? `${limpo.slice(0, TAMANHO_DESCRICAO - 1).trimEnd()}…`
    : limpo;
}

// Prévia do link (Open Graph). O site é React puro: o robô do WhatsApp, LinkedIn, Facebook e X lê só o HTML inicial e
// nunca vê o título nem a capa da campanha. Os botões de compartilhar da página da campanha apontam para CÁ: o robô
// lê as tags og:* deste HTML pequeno, e a pessoa é mandada na hora para a página de verdade (PAINEL_URL/campanha/:id)
// pelo meta refresh (sem script: o helmet bloqueia script inline). A visibilidade é a de sempre (pol_campanha_select,
// via CampanhaServiceFindOne, sem sessão): campanha que o público não vê dá 404, sem vazar título nem capa.
@Controller('compartilhar')
export class CampanhaControllerShare {
  constructor(
    private readonly service: CampanhaServiceFindOne,
    private readonly config: ConfigService,
  ) {}

  @Get('campanha/:id')
  @Publico()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  async previa(@Param('id', ParseIntPipe) id: number): Promise<string> {
    const site = (this.config.get<string>('PAINEL_URL') ?? '').replace(
      /\/+$/,
      '',
    );
    const destino = `${site}/campanha/${id}`;
    // Campanha escondida pela RLS: NotFoundException (404), como na página.
    const campanha = await this.service.executar(id);
    const titulo = escaparHtml(campanha.titulo);
    const descricao = escaparHtml(resumir(campanha.descricao));
    const url = escaparHtml(destino);
    const imagem = campanha.imagemCapaUrl
      ? `\n    <meta property="og:image" content="${escaparHtml(campanha.imagemCapaUrl)}">\n    <meta name="twitter:image" content="${escaparHtml(campanha.imagemCapaUrl)}">`
      : '';
    return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>${titulo} | CrowdAcadêmico</title>
    <meta name="description" content="${descricao}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="CrowdAcadêmico">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:title" content="${titulo}">
    <meta property="og:description" content="${descricao}">
    <meta property="og:url" content="${url}">${imagem}
    <meta name="twitter:card" content="${campanha.imagemCapaUrl ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${titulo}">
    <meta name="twitter:description" content="${descricao}">
    <link rel="canonical" href="${url}">
    <meta http-equiv="refresh" content="0; url=${url}">
  </head>
  <body>
    <p><a href="${url}">Abrir a campanha ${titulo}</a></p>
  </body>
</html>`;
  }
}
