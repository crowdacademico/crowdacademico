import { AcaoLinha } from '../acao-linha';
import { TabelaBancada } from './tabela-bancada';
import type { ColunaBancada } from './tabela-bancada';
import { CAMPANHA_BLOQUEADA } from '../../../services/campo-testes/util/registros-bloqueados';
import {
  ROTULO_STATUS_CAMPANHA,
  classeBadgeStatusCampanha,
} from '../../../services/12-campanha/constants/status-campanha.constants';
import { formatarMoeda } from '../../../services/constant/utils/formatacao.util';
import type { CampanhaResponse } from '../../../services/12-campanha/type/campanha.type';

// Campanhas do Campo de Testes (T2, views/campo-testes/bancada-campanha.tsx, que busca e abre os modais). As
// campanhas da demonstração do seed ficam riscadas; as ações continuam na linha (Consultar é só leitura; Alterar
// e Excluir mostram o bloqueio dentro do próprio modal).

interface TabelaBancadaCampanhaProps {
  campanhas: CampanhaResponse[];
  nomeDe: (idUsuario: number) => string;
  aoAlterar: (campanha: CampanhaResponse) => void;
  aoConsultar: (campanha: CampanhaResponse) => void;
  aoExcluir: (campanha: CampanhaResponse) => void;
}

export function TabelaBancadaCampanha({ campanhas, nomeDe, aoAlterar, aoConsultar, aoExcluir }: TabelaBancadaCampanhaProps) {
  const colunas: ColunaBancada<CampanhaResponse>[] = [
    { rotulo: 'id', tipo: 'id', riscar: true, celula: (campanha) => campanha.idCampanha },
    { rotulo: 'título', riscar: true, celula: (campanha) => campanha.titulo },
    {
      rotulo: 'status',
      tipo: 'centralizada',
      riscar: true,
      celula: (campanha) => (
        <span className={`badge ${classeBadgeStatusCampanha(campanha.status)}`}>{ROTULO_STATUS_CAMPANHA[campanha.status]}</span>
      ),
    },
    { rotulo: 'dono', riscar: true, celula: (campanha) => nomeDe(campanha.idUsuario) },
    { rotulo: 'meta', tipo: 'centralizada', celula: (campanha) => formatarMoeda(campanha.metaFinanceira) },
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
