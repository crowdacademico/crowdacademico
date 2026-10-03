import { Campo } from '../../components/input/campo';
import { useRegrasCampanha } from '../../services/12-campanha/hook/use-regras-campanha';
import { useDecisaoAprovacao, usePronta } from '../../services/12-campanha/hook/use-decisao-aprovacao';
import type { DecisaoAprovacao } from '../../services/12-campanha/hook/use-decisao-aprovacao';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { OrcamentoCampanhaResponse } from '../../services/13-orcamento-campanha/type/orcamento-campanha.type';
import type { MarcoCronogramaResponse } from '../../services/14-marco-cronograma/type/marco-cronograma.type';

// As peças de aprovar ou rejeitar uma campanha, usadas pela fila real (modal-revisar-campanha.tsx) e pela Bancada
// da Campanha (SecaoDecisaoAprovacao, abaixo): o mesmo checklist, o mesmo campo de motivo e os mesmos botões.

type DadosDecisao = Parameters<typeof usePronta>[0];

const itemChecklist = (ok: boolean, texto: string) => (
  <li className={'paragrafo flex items-start gap-2 texto-herdado ' + (ok ? 'texto-sucesso' : 'texto-erro')}>
    <i className={'fa-solid mt-1 ' + (ok ? 'fa-circle-check' : 'fa-circle-xmark')} aria-hidden="true"></i>
    <span>{texto}</span>
  </li>
);

export function ChecklistAprovacao(dados: DadosDecisao) {
  const { minimoItensOrcamento, minimoMarcosCronograma } = useRegrasCampanha();
  const { itensOk, metaBatendo, cronogramaOk } = usePronta(dados);
  return (
    <div className="fundo-cartao rounded-xl border borda-padrao p-4 space-y-2">
      <p className="rotulo-leitura">Pronta para aprovar?</p>
      <ul className="space-y-1">
        {itemChecklist(itensOk && metaBatendo, `Orçamento: ${dados.orcamento.length}/${minimoItensOrcamento} itens e soma igual à meta`)}
        {itemChecklist(cronogramaOk, `Cronograma: ${dados.cronograma.length}/${minimoMarcosCronograma} marcos`)}
      </ul>
    </div>
  );
}

export function CampoMotivoRejeicao({ decisao }: { decisao: DecisaoAprovacao }) {
  return (
    <Campo rotulo="Motivo da rejeição (obrigatório para rejeitar)" erro={decisao.erroMotivo}>
      {({ atributos, classeErro }) => (
        <textarea
          {...atributos}
          className={'input-padrao' + classeErro}
          rows={4}
          value={decisao.justificativa}
          onChange={(evento) => decisao.setJustificativa(evento.target.value)}
          placeholder="O pesquisador lê este texto para corrigir e reenviar."
        />
      )}
    </Campo>
  );
}

export function BotoesDecisao({ decisao, pronta }: { decisao: DecisaoAprovacao; pronta: boolean }) {
  return (
    <>
      <button type="button" onClick={() => void decisao.decidir('rejeitar')} disabled={decisao.ocupado} className="btn btn-danger">
        Rejeitar
      </button>
      <button type="button" onClick={() => void decisao.decidir('aprovar')} disabled={decisao.ocupado || !pronta} className="btn btn-primary">
        {decisao.ocupado ? 'Enviando...' : 'Aprovar'}
      </button>
    </>
  );
}

// Versão em bloco para a Bancada da Campanha: checklist, motivo e botões juntos, dentro do Alterar Campanha. Montada de novo a cada
// campanha (`key`), então o motivo começa vazio.
export function SecaoDecisaoAprovacao({
  authFetch,
  campanha,
  orcamento,
  cronograma,
  reportarErro,
  aoConcluido,
}: {
  authFetch: AuthFetch;
  campanha: CampanhaResponse;
  orcamento: OrcamentoCampanhaResponse[];
  cronograma: MarcoCronogramaResponse[];
  reportarErro: (erro: unknown) => unknown;
  aoConcluido: () => void;
}) {
  const decisao = useDecisaoAprovacao({ authFetch, idCampanha: campanha.idCampanha, reportarErro, aoConcluido });
  const dados = { orcamento, cronograma, metaFinanceira: campanha.metaFinanceira };
  const { pronta } = usePronta(dados);
  return (
    <div className="space-y-4">
      <ChecklistAprovacao {...dados} />
      <CampoMotivoRejeicao decisao={decisao} />
      <div className="flex flex-wrap gap-3 justify-end">
        <BotoesDecisao decisao={decisao} pronta={pronta} />
      </div>
    </div>
  );
}
