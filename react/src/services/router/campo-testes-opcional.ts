import type { ComponentType, ReactNode } from 'react';
import type { Rota } from './rotas.constants';

// O Campo de Testes (src/campo-testes/) entra no sistema só por aqui, e só em desenvolvimento: em produção a
// rota nem existe e o grupo some do menu. Se a pasta não existir, o glob volta vazio e o sistema compila igual.
// O ESLint (no-restricted-imports) barra qualquer import direto do sistema para dentro dela.
interface PluginCampoTestes {
  ROTAS_CAMPO_TESTES: Rota[];
  CampoTestesProvider: ComponentType<{ children: ReactNode }>;
}

const modulos = import.meta.env.DEV
  ? import.meta.glob<PluginCampoTestes>('../../campo-testes/plugin.ts', { eager: true })
  : {};

export const campoTestes = Object.values(modulos).at(0);
