import { useCallback, useState } from 'react';
import { BadgeStatusContribuicao } from '../../components/crud/badge-status-contribuicao';
import { BadgeStatusRepasse } from '../../components/crud/badge-status-repasse';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { GenericTable } from '../../components/crud/generic-table';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { ROTULO_MEIO_PAGAMENTO } from '../../services/22-contribuicao/constants/contribuicao.constants';
import { ROTULO_STATUS_CONTRIBUICAO } from '../../services/22-contribuicao/constants/status-contribuicao.constants';
import { ROTULO_STATUS_REPASSE } from '../../services/23-pagamento/constants/status-repasse.constants';
import { pagamentoRevisaoApi } from '../../services/25-pagamento-revisao/api/pagamento-revisao.api';
import { formatarDataHora, formatarMoeda } from '../../services/constant/util/formatacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { AuditoriaFinanceiraResponse } from '../../services/25-pagamento-revisao/type/pagamento-revisao.type';
import type { StatusContribuicao, StatusRepasse } from '../../services/constant/type/enums-do-banco.gerado';

interface AuditoriaLinha extends AuditoriaFinanceiraResponse {
  ehContribuicao: boolean;
  tipoRegistro: string;
  registro: string;
  de: string;
  para: string;
  quem: string;
}

const ehStatusContribuicao = (status: string): status is StatusContribuicao => Object.hasOwn(ROTULO_STATUS_CONTRIBUICAO, status);
const ehStatusRepasse = (status: string): status is StatusRepasse => Object.hasOwn(ROTULO_STATUS_REPASSE, status);

// A situação com a mesma pílula colorida das outras telas (contribuição ou repasse); um valor que o sistema não
// conhece aparece como o banco gravou, e nenhum, como "-".
function PilulaSituacao({ ehContribuicao, status }: { ehContribuicao: boolean; status: string | null }) {
  if (status === null) return <>-</>;
  if (ehContribuicao && ehStatusContribuicao(status)) return <BadgeStatusContribuicao status={status} />;
  if (!ehContribuicao && ehStatusRepasse(status)) return <BadgeStatusRepasse status={status} />;
  return <>{status}</>;
}

const ROTULO_SISTEMA = 'Sistema';
const TIPO_CONTRIBUICAO = 'Contribuição';
const TIPO_REPASSE = 'Repasse';

// O rótulo de tela da situação; um valor que a lista de rótulos não conhece aparece como o banco gravou.
function rotulo(mapa: Readonly<Record<string, string>>, chave: string | null): string {
  if (chave === null) return '-';
  return Object.hasOwn(mapa, chave) ? mapa[chave] : chave;
}

function paraLinha(registro: AuditoriaFinanceiraResponse): AuditoriaLinha {
  const ehContribuicao = registro.idContribuicao !== null;
  const situacoes = ehContribuicao ? ROTULO_STATUS_CONTRIBUICAO : ROTULO_STATUS_REPASSE;
  return {
    ...registro,
    ehContribuicao,
    tipoRegistro: ehContribuicao ? TIPO_CONTRIBUICAO : TIPO_REPASSE,
    registro: ehContribuicao ? `${TIPO_CONTRIBUICAO} #${registro.idContribuicao}` : `${TIPO_REPASSE} #${registro.idRepasse}`,
    de: rotulo(situacoes, registro.statusAnterior),
    para: rotulo(situacoes, registro.statusNovo),
    quem: registro.idResponsavel === null ? ROTULO_SISTEMA : (registro.nomeResponsavel ?? `Usuário #${registro.idResponsavel}`),
  };
}

// Auditoria Financeira: cada mudança de dinheiro do sistema (contribuição e repasse), a mais nova primeiro, com quem
// fez ("Sistema" quando foi uma tarefa automática ou um aviso do provedor). Só leitura: nada aqui muda dinheiro. O
// "registro" é a coluna nome da tabela (DS-45: é ela que fica com a sobra de largura); "de" e "para" usam as pílulas de
// situação das outras telas; "quando" fica por último, antes das ações. O "o que aconteceu" fica só na ficha, com o
// código como o banco grava, como Eventos de Pagamento mostra o código do provedor.
export function ListarAuditoriaFinanceira({ auth }: PropsPagina) {
  const [aberto, setAberto] = useState<AuditoriaLinha | null>(null);

  const listar = useCallback(
    async (): Promise<AuditoriaLinha[]> => (await pagamentoRevisaoApi.listarAuditoria(auth.authFetch)).map(paraLinha),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Auditoria Financeira"
        ajuda="Toda mudança de dinheiro do sistema, a mais nova primeiro: cada contribuição e cada repasse, de qual situação para qual, o valor e quem fez. Sistema: foi uma tarefa automática ou um aviso do provedor de pagamento. Só leitura."
        colunas={[
          { chave: 'idAuditoria', rotulo: 'id', tipo: 'id' },
          { chave: 'registro', rotulo: 'registro', tipo: 'nome', umaLinha: true },
          {
            chave: 'de',
            rotulo: 'de',
            tipo: 'status',
            renderizar: (linha: AuditoriaLinha) => <PilulaSituacao ehContribuicao={linha.ehContribuicao} status={linha.statusAnterior} />,
            textoExibido: (linha: AuditoriaLinha) => linha.de,
          },
          {
            chave: 'para',
            rotulo: 'para',
            tipo: 'status',
            renderizar: (linha: AuditoriaLinha) => <PilulaSituacao ehContribuicao={linha.ehContribuicao} status={linha.statusNovo} />,
            textoExibido: (linha: AuditoriaLinha) => linha.para,
          },
          { chave: 'valor', rotulo: 'valor', tipo: 'dinheiro' },
          { chave: 'quem', rotulo: 'quem', tipo: 'texto', umaLinha: true },
          { chave: 'ocorridoEm', rotulo: 'quando', tipo: 'dataHora' },
        ]}
        vazio={{
          icone: 'fa-scale-balanced',
          titulo: 'Nenhum registro financeiro ainda.',
          texto: 'Cada contribuição e cada repasse deixam um registro aqui a cada mudança de situação.',
        }}
        chavePrimaria="idAuditoria"
        listar={listar}
        acoes={{ consultar: (linha) => setAberto(linha) }}
        filtrosFacetados={[
          { chave: 'tipoRegistro', rotulo: 'Registro', ordem: [TIPO_CONTRIBUICAO, TIPO_REPASSE] },
          { chave: 'quem', rotulo: 'Quem' },
        ]}
      />

      {aberto && (
        <ModalFicha
          titulo={`Registro financeiro #${aberto.idAuditoria}`}
          subtitulo={aberto.registro}
          aoFechar={() => setAberto(null)}
          rodape={<RodapeAcoes aoCancelar={() => setAberto(null)} rotuloCancelar="Fechar" />}
        >
          <SecaoFicha titulo="O registro">
            <CampoFicha rotulo="Registro" valor={aberto.registro} />
            <CampoFicha rotulo="Quando" valor={formatarDataHora(aberto.ocorridoEm)} />
            <CampoFicha rotulo="Situação anterior" valor={<PilulaSituacao ehContribuicao={aberto.ehContribuicao} status={aberto.statusAnterior} />} />
            <CampoFicha rotulo="Situação nova" valor={<PilulaSituacao ehContribuicao={aberto.ehContribuicao} status={aberto.statusNovo} />} />
            <CampoFicha rotulo="Valor" valor={formatarMoeda(aberto.valor)} />
            <CampoFicha rotulo="Meio de pagamento" valor={rotulo(ROTULO_MEIO_PAGAMENTO, aberto.meioPagamento)} />
            <CampoFicha rotulo="Quem fez" valor={aberto.quem} />
            <CampoFicha rotulo="Aviso do provedor" valor={aberto.idEventoPagamento === null ? null : `#${aberto.idEventoPagamento}`} />
            <CampoFicha rotulo="O que aconteceu" valor={aberto.evento} largura="cheia" />
          </SecaoFicha>
        </ModalFicha>
      )}
    </div>
  );
}
