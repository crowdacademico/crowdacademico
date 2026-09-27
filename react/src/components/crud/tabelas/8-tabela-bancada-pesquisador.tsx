import { AcaoLinha } from '../acao-linha';
import { Dica } from '../../layout/tooltip';
import { TabelaBancada } from './tabela-bancada';
import type { ColunaBancada } from './tabela-bancada';
import { ORDEM_PODER_PAPEL, PAPEL_SEM_EXTRA } from '../../../services/2-papel-permissao/constants/papel-ordem-poder';
import { PESQUISADOR_BLOQUEADO, motivoBloqueioPesquisador } from '../../../services/campo-testes/util/registros-bloqueados';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TITULO_ACADEMICO,
} from '../../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { UsuarioResponse } from '../../../services/1-usuario/type/usuario.type';
import type { PerfilPesquisadorResponse } from '../../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';

// Usuários do Campo de Testes (T1, views/campo-testes/bancada-pesquisador.tsx, que busca e abre os modais):
// papel, título, status e score de cada conta, com o cadeado de upgrade para quem ainda não é pesquisador. Os
// pesquisadores da demonstração do seed ficam bloqueados (riscados, sem ações).

// Perfil pode não existir (upgrade nunca feito): os campos do perfil ficam opcionais.
export interface PesquisadorLinha extends Partial<PerfilPesquisadorResponse> {
  idUsuario: number;
  usuario: UsuarioResponse;
  // Papéis além do padrão 'usuario', separados por vírgula (ou PAPEL_SEM_EXTRA).
  papel: string;
}

const papeisDe = (linha: PesquisadorLinha) => linha.papel.split(', ').filter(Boolean);

// Papéis do menor para o maior poder; papel fora da lista vai para o fim.
const posicaoPapel = (papel: string) => {
  const indice = ORDEM_PODER_PAPEL.indexOf(papel);
  return indice === -1 ? ORDEM_PODER_PAPEL.length : indice;
};

interface TabelaBancadaPesquisadorProps {
  linhas: PesquisadorLinha[];
  carregando: boolean;
  erro: string | null;
  aoAlterar: (linha: PesquisadorLinha) => void;
  aoConsultar: (linha: PesquisadorLinha) => void;
  aoExcluir: (linha: PesquisadorLinha) => void;
  aoUpgrade: (linha: PesquisadorLinha) => void;
}

export function TabelaBancadaPesquisador({ linhas, carregando, erro, aoAlterar, aoConsultar, aoExcluir, aoUpgrade }: TabelaBancadaPesquisadorProps) {
  const colunas: ColunaBancada<PesquisadorLinha>[] = [
    { rotulo: 'id', tipo: 'id', riscar: true, celula: (linha) => linha.idUsuario },
    { rotulo: 'nome', riscar: true, celula: (linha) => linha.usuario.nome },
    { rotulo: 'papel', riscar: true, celula: (linha) => linha.papel },
    { rotulo: 'título', riscar: true, celula: (linha) => (linha.tituloAcademico ? ROTULO_TITULO_ACADEMICO[linha.tituloAcademico] : '-') },
    {
      rotulo: 'status',
      tipo: 'centralizada',
      riscar: true,
      celula: (linha) => (linha.statusPesquisador ? ROTULO_STATUS_PESQUISADOR[linha.statusPesquisador] : '-'),
    },
    { rotulo: 'score', tipo: 'centralizada', celula: (linha) => linha.scoreAtual ?? '-' },
    {
      rotulo: 'upgrade',
      tipo: 'centralizada',
      // Cadeado em toda linha sem perfil, própria ou de outra pessoa: o ModalUpgradePesquisador decide sozinho
      // qual endpoint usar (self-service ou "para outro").
      celula: (linha) =>
        linha.statusPesquisador !== undefined ? (
          <span className="badge badge-sucesso">Pesquisador</span>
        ) : (
          <button
            type="button"
            onClick={() => aoUpgrade(linha)}
            disabled={PESQUISADOR_BLOQUEADO(linha.idUsuario)}
            aria-label="Fazer upgrade de perfil pra pesquisador"
            className="dica"
          >
            <i className="fa-solid fa-lock texto-aviso"></i>
            <Dica texto="Fazer upgrade de perfil pra pesquisador" curta />
          </button>
        ),
    },
  ];

  return (
    <TabelaBancada
      titulo="Usuários"
      rotuloOcultar="Ocultar bloqueados (demonstração)"
      linhas={linhas}
      chave={(linha) => linha.idUsuario}
      colunas={colunas}
      bloqueada={(linha) => PESQUISADOR_BLOQUEADO(linha.idUsuario)}
      carregando={carregando}
      erro={erro}
      textosBusca={(linha) => [
        linha.idUsuario,
        linha.usuario.nome,
        linha.tituloAcademico ? ROTULO_TITULO_ACADEMICO[linha.tituloAcademico] : undefined,
        linha.statusPesquisador ? ROTULO_STATUS_PESQUISADOR[linha.statusPesquisador] : undefined,
        linha.papel,
      ]}
      // Pré-marcado com usuário/pesquisador para adiantar os testes (só nesta tela; o resto do painel começa
      // em "Todos").
      faceta={{
        rotulo: 'Papel',
        valores: papeisDe,
        ordenar: (a, b) => posicaoPapel(a) - posicaoPapel(b) || a.localeCompare(b, 'pt-BR'),
        inicial: [PAPEL_SEM_EXTRA, 'pesquisador'],
      }}
      acoes={(linha, bloqueada) =>
        bloqueada ? (
          <span className="dica" tabIndex={0} role="note" aria-label={motivoBloqueioPesquisador()}>
            <i className="fa-solid fa-lock"></i> bloqueado
            <Dica texto={motivoBloqueioPesquisador()} />
          </span>
        ) : (
          <div className="crud-tabela__acoes">
            <AcaoLinha rotulo="Alterar" icone="fa-pen" variante="alterar" onClick={() => aoAlterar(linha)} />
            <AcaoLinha rotulo="Consultar" icone="fa-eye" onClick={() => aoConsultar(linha)} />
            <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => aoExcluir(linha)} />
          </div>
        )
      }
    />
  );
}
