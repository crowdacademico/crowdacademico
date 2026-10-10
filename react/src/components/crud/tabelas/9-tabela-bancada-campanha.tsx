import { AcaoLinha } from '../acao-linha';
import { Dica } from '../../layout/tooltip';
import { STATUS_ACEITA_COMENTARIO } from '../../../services/12-campanha/constants/status-campanha.constants';
import { TabelaBancada } from './tabela-bancada';
import type { ColunaBancada } from './tabela-bancada';
import { CAMPANHA_BLOQUEADA } from '../../../services/campo-testes/util/registros-bloqueados.util';
import { BadgeStatusCampanha } from '../badge-status-campanha';
import { formatarMoeda } from '../../../services/constant/util/formatacao.util';
import type { CampanhaResponse } from '../../../services/12-campanha/type/campanha.type';
import { TextoResumido } from '../texto-resumido';

// Campanhas do Campo de Testes (T2, views/campo-testes/bancada-campanha.tsx, que busca e abre os modais). As
// campanhas da demonstração do seed ficam riscadas; as ações continuam na linha (Consultar é só leitura; Alterar
// e Excluir mostram o bloqueio dentro do próprio modal).

interface TabelaBancadaCampanhaProps {
  campanhas: CampanhaResponse[];
  nomeDe: (idUsuario: number) => string;
  aoAlterar: (campanha: CampanhaResponse) => void;
  aoConsultar: (campanha: CampanhaResponse) => void;
  aoExcluir: (campanha: CampanhaResponse) => void;
  aoComentar: (campanha: CampanhaResponse) => void;
}

export function TabelaBancadaCampanha({ campanhas, nomeDe, aoAlterar, aoConsultar, aoExcluir, aoComentar }: TabelaBancadaCampanhaProps) {
  const colunas: ColunaBancada<CampanhaResponse>[] = [
    { rotulo: 'id', tipo: 'id', riscar: true, celula: (campanha) => campanha.idCampanha },
    {
      rotulo: 'título',
      riscar: true,
      celula: (campanha) => (
        <span className="crud-tabela__nome">
          <TextoResumido texto={campanha.titulo} />
        </span>
      ),
    },
    {
      rotulo: 'status',
      tipo: 'centralizada',
      riscar: true,
      celula: (campanha) => (
        <BadgeStatusCampanha campanha={campanha} />
      ),
    },
    { rotulo: 'dono', riscar: true, celula: (campanha) => nomeDe(campanha.idUsuario) },
    { rotulo: 'meta', tipo: 'centralizada', celula: (campanha) => formatarMoeda(campanha.metaFinanceira) },
    {
      rotulo: 'comentar',
      tipo: 'centralizada',
      // Só campanha publicada recebe comentário (menos rejeitada e encerrada por moderação, RF-092); as da
      // demonstração ficam sem a ação, para a demonstração continuar como está.
      celula: (campanha) => {
        const aceita = STATUS_ACEITA_COMENTARIO.has(campanha.status) && !CAMPANHA_BLOQUEADA(campanha.idCampanha);
        const motivo = CAMPANHA_BLOQUEADA(campanha.idCampanha)
          ? 'Campanha da demonstração: não recebe comentário de teste'
          : aceita
            ? 'Comentar em nome de um pesquisador'
            : 'Só campanha publicada recebe comentário (não rascunho, aguardando, rejeitada ou encerrada por moderação)';
        return (
          <button type="button" onClick={() => aoComentar(campanha)} disabled={!aceita} aria-label={motivo} className="dica">
            <i className={'fa-solid fa-comment ' + (aceita ? 'texto-marca' : 'texto-fraco')} aria-hidden="true"></i>
            <Dica texto={motivo} />
          </button>
        );
      },
    },
  ];

  return (
    <TabelaBancada
      titulo="Campanhas"
      rotuloOcultar="Ocultar bloqueadas (demonstração)"
      linhas={campanhas}
      chave={(campanha) => campanha.idCampanha}
      colunas={colunas}
      bloqueada={(campanha) => CAMPANHA_BLOQUEADA(campanha.idCampanha)}
      textosBusca={(campanha) => [campanha.idCampanha, campanha.titulo, campanha.status, nomeDe(campanha.idUsuario)]}
      faceta={{ rotulo: 'Status', valores: (campanha) => [campanha.status] }}
      acoes={(campanha) => (
        <div className="crud-tabela__acoes">
          <AcaoLinha rotulo="Alterar" icone="fa-pen" variante="alterar" onClick={() => aoAlterar(campanha)} />
          <AcaoLinha rotulo="Consultar" icone="fa-eye" onClick={() => aoConsultar(campanha)} />
          <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => aoExcluir(campanha)} />
        </div>
      )}
    />
  );
}
