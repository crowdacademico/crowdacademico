import { ROTAS_ADMIN } from './rotas.constants';
import type { Rota } from './rotas.constants';

// "Acessados recentemente" do Dashboard: as últimas páginas do painel que a pessoa abriu neste navegador, mais
// recente primeiro. Só entra rota que está no menu (ROTAS_ADMIN com rotuloMenu), fora o próprio Dashboard; a
// lista guarda só o caminho, rótulo e ícone vêm sempre de ROTAS_ADMIN (renomear uma página não deixa rótulo
// velho salvo). Chave por usuário: trocar de conta no mesmo navegador não mostra o histórico da outra.
//
// localStorage pode falhar (aba anônima, armazenamento bloqueado): aí a lista só fica vazia, nada quebra.
const QUANTIDADE_ACESSADOS = 5;
const CAMINHO_DASHBOARD = '/admin/dashboard';

const chave = (idUsuario: number) => `crowdacademico.acessadosRecentemente.${idUsuario}`;

function rotaDoMenu(caminho: string): Rota | undefined {
  return ROTAS_ADMIN.find((rota) => rota.caminho === caminho && rota.rotuloMenu && rota.caminho !== CAMINHO_DASHBOARD);
}

function lerCaminhos(idUsuario: number): string[] {
  try {
    const salvo: unknown = JSON.parse(localStorage.getItem(chave(idUsuario)) ?? '[]');
    return Array.isArray(salvo) ? salvo.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function registrarAcesso(idUsuario: number, caminho: string): void {
  if (!rotaDoMenu(caminho)) return;
  const caminhos = [caminho, ...lerCaminhos(idUsuario).filter((salvo) => salvo !== caminho)].slice(
    0,
    QUANTIDADE_ACESSADOS,
  );
  try {
    localStorage.setItem(chave(idUsuario), JSON.stringify(caminhos));
  } catch {
    // sem armazenamento, sem lista
  }
}

export function lerAcessadosRecentemente(idUsuario: number): Rota[] {
  return lerCaminhos(idUsuario)
    .map(rotaDoMenu)
    .filter((rota): rota is Rota => rota !== undefined);
}
