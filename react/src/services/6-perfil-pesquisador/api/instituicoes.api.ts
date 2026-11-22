import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';
import { INSTITUICOES_INICIAIS } from '../constants/instituicoes-sugeridas.constants';

interface InstituicaoSugerida {
  nome: string;
  quantidade: number;
}

const chave = (nome: string) => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Uma busca por carregamento da página: o cadastro, o modal de virar pesquisador e o painel usam a mesma lista.
let pedido: Promise<string[]> | null = null;

// Sugestões do campo Instituição (21-11-2026): primeiro as que os pesquisadores já usam (a mais usada primeiro),
// depois a lista inicial fixa, sem repetir (comparação sem acento e sem maiúsculas). Se a API falhar, fica só a fixa.
export function listarInstituicoesSugeridas(): Promise<string[]> {
  pedido ??= fetch(`${API_BASE_URL}/perfil-pesquisador/instituicoes`)
    .then(tratarResposta<InstituicaoSugerida[]>)
    .then((usadas) => usadas.map((instituicao) => instituicao.nome))
    .catch(() => [] as string[])
    .then((usadas) => {
      const vistas = new Set(usadas.map(chave));
      return [...usadas, ...INSTITUICOES_INICIAIS.filter((nome) => !vistas.has(chave(nome)))];
    });
  return pedido;
}
