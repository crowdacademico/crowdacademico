import type { Rota } from '../services/router/rotas.constants';
import { GuiaEstilo } from './paginas/guia-estilo/1-guia-estilo';

// Segunda porta do Campo de Testes (28-11-2026, Lucas): SÓ o Guia de Estilo, no site publicado. Carregada por
// services/router/campo-testes-opcional.ts apenas no build com VITE_MOSTRAR_GUIA_ESTILO=true (o resto do Campo de Testes
// nunca vai para o build). Em `npm run dev` o Guia já vem pelo plugin.ts, dentro do Campo de Testes.
// É uma página só visual (não chama o backend). Fica em Configurações e só para quem gerencia os Parâmetros do Sistema
// (o admin): a banca vê quando o Lucas mostra, e quem visita o site não esbarra nela.
export const ROTA_GUIA_ESTILO: Rota = {
  caminho: '/admin/guia-estilo',
  permissoes: ['configuracao_gerenciar'],
  caminhoRelativo: 'guia-estilo',
  elemento: GuiaEstilo,
  rotuloMenu: 'Guia de Estilo',
  rotuloBreadcrumb: 'Guia de Estilo',
  grupoMenu: 'CONFIGURACOES',
  icone: 'fa-palette',
};
