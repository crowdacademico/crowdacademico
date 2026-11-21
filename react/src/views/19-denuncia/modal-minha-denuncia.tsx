import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { IndicadorEtapas } from '../../components/crud/indicador-etapas';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import {
  CLASSE_BADGE_STATUS_DENUNCIA,
  ROTULO_STATUS_DENUNCIA,
  situacaoDenuncia,
} from '../../services/19-denuncia/constants/status-denuncia.constants';
import type { SituacaoDenuncia } from '../../services/19-denuncia/constants/status-denuncia.constants';
import type { DenunciaResponse } from '../../services/19-denuncia/type/denuncia.type';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';

// A denúncia que a pessoa fez, vista por ela (Minha Conta > Minhas atividades, 21-11-2026). Primeiro era a ficha da
// área restrita (grade com rótulos em maiúsculas), e a Alexia achou esquisito na área pública: é tela de quem
// administra. Aqui segue o padrão de acompanhamento de pedido (a Central de Suporte do Facebook, o rastreio de
// encomenda): as etapas no topo, o resultado numa caixa em destaque e, embaixo, o que a pessoa enviou. Quem julgou
// não aparece: a decisão é da moderação, não de uma pessoa.

type Etapa = 'enviada' | 'analise' | 'decidida' | 'revisao';

const DESFECHO: Record<SituacaoDenuncia, { titulo: string; texto: string; icone: string }> = {
  pendente: {
    titulo: 'Em análise',
    texto: 'A moderação ainda vai analisar esta denúncia. Quando decidir, o resultado aparece aqui.',
    icone: 'fa-hourglass-half',
  },
  resolvida: {
    titulo: 'Denúncia confirmada',
    texto: 'A moderação analisou e concordou com você: o problema foi confirmado e tratado.',
    icone: 'fa-circle-check',
  },
  improcedente: {
    titulo: 'Nenhum problema encontrado',
    texto: 'A moderação analisou e não encontrou o problema apontado, então nada mudou.',
    icone: 'fa-circle-info',
  },
  em_contestacao: {
    titulo: 'Decisão contestada',
    texto: 'A moderação concordou com você, mas o pesquisador contestou a decisão. A moderação vai analisar de novo, e o resultado pode mudar.',
    icone: 'fa-scale-balanced',
  },
};

interface ModalMinhaDenunciaProps {
  denuncia: DenunciaResponse;
  alvo: string;
  aoFechar: () => void;
}

export function ModalMinhaDenuncia({ denuncia, alvo, aoFechar }: ModalMinhaDenunciaProps) {
  const situacao = situacaoDenuncia(denuncia);
  const desfecho = DESFECHO[situacao];
  const contestada = denuncia.contestacaoStatus !== null;

  const etapas: { chave: Etapa; rotulo: string }[] = [
    { chave: 'enviada', rotulo: 'Enviada' },
    { chave: 'analise', rotulo: 'Em análise' },
    { chave: 'decidida', rotulo: 'Decidida' },
    ...(contestada ? [{ chave: 'revisao' as const, rotulo: 'Revisão' }] : []),
  ];
  const atual: Etapa = situacao === 'pendente' ? 'analise' : contestada ? 'revisao' : 'decidida';

  return (
    <ModalFicha
      titulo="Sua denúncia"
      subtitulo={alvo}
      aoFechar={aoFechar}
      fecharAoClicarFora
      rodape={<RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />}
    >
      <div className="space-y-6">
        <IndicadorEtapas etapas={etapas} atual={atual} />

        <CaixaAviso tom="info" icone={desfecho.icone} titulo={desfecho.titulo}>
          <p>{desfecho.texto}</p>
          {denuncia.justificativaModeracao && situacao !== 'pendente' && (
            <p className="mt-3">
              <span className="enfase">Resposta da moderação:</span> {denuncia.justificativaModeracao}
            </p>
          )}
          {denuncia.contestacaoStatus === 'aceita' && (
            <p className="mt-3">
              <span className="enfase">Revisão:</span> o pesquisador contestou e a moderação reviu a decisão.
              {denuncia.justificativaContestacao ? ` ${denuncia.justificativaContestacao}` : ''}
            </p>
          )}
        </CaixaAviso>

        <section aria-labelledby="minha-denuncia-enviado">
          <h3 id="minha-denuncia-enviado" className="subtitulo mb-3">O que você enviou</h3>
          <dl className="space-y-3 paragrafo texto-padrao">
            <div className="flex flex-wrap items-center gap-2">
              <dt className="texto-fraco">Situação:</dt>
              <dd>
                <span className={'badge ' + CLASSE_BADGE_STATUS_DENUNCIA[situacao]}>{ROTULO_STATUS_DENUNCIA[situacao]}</span>
              </dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="texto-fraco">Motivo:</dt>
              <dd>{denuncia.motivo}</dd>
            </div>
            {denuncia.relato && (
              <div>
                <dt className="texto-fraco mb-1">Seu relato:</dt>
                <dd className="whitespace-pre-wrap fundo-sutil rounded-lg p-3">{denuncia.relato}</dd>
              </div>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1 legenda texto-fraco">
              <span>Enviada em {formatarDataHora(denuncia.criadoEm, true)}</span>
              {denuncia.julgadoEm && <span>Decidida em {formatarDataHora(denuncia.julgadoEm, true)}</span>}
            </div>
          </dl>
        </section>
      </div>
    </ModalFicha>
  );
}
