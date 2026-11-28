import type { ComponentType, ReactNode } from 'react';
import type { Rota } from './rotas.constants';

// O Campo de Testes (src/30-campo-testes/) entra no sistema só por aqui, e só em desenvolvimento: em produção a
// rota nem existe e o grupo some do menu. Se a pasta não existir, o glob volta vazio e o sistema compila igual.
// O ESLint (no-restricted-imports) barra qualquer import direto do sistema para dentro dela.
interface PluginCampoTestes {
  ROTAS_CAMPO_TESTES: Rota[];
  CampoTestesProvider: ComponentType<{ children: ReactNode }>;
}

const modulos = import.meta.env.DEV
  ? import.meta.glob<PluginCampoTestes>('../../30-campo-testes/plugin.ts', { eager: true })
  : {};

export const campoTestes = Object.values(modulos).at(0);

// Só o Guia de Estilo, no BUILD (o site publicado), quando o serviço do site no Render tem VITE_MOSTRAR_GUIA_ESTILO=true
// (28-11-2026). O Vite troca as duas condições por constantes no build: sem a variável, o Guia nem entra no pacote. Em
// desenvolvimento não carrega: o Guia já vem no Campo de Testes acima.
interface PluginGuiaEstilo {
  ROTA_GUIA_ESTILO: Rota;
}

const modulosGuia =
  !import.meta.env.DEV && import.meta.env.VITE_MOSTRAR_GUIA_ESTILO === 'true'
    ? import.meta.glob<PluginGuiaEstilo>('../../30-campo-testes/plugin-guia-estilo.ts', { eager: true })
    : {};

export const guiaEstiloPublicado = Object.values(modulosGuia).at(0);
