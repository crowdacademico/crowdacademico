import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { OBSERVACAO_REVISAO_LIMITE } from '../../services/32-pagamento-revisao/constants/pagamento-revisao.constants';
import type { ReactNode } from 'react';

interface CampoObservacaoRevisaoProps {
  rotulo: string;
  dica?: ReactNode;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
}

// A observação obrigatória de toda ação dos painéis de pagamento: o que foi feito FORA do sistema. Fica na
// auditoria financeira, com o nome de quem registrou.
export function CampoObservacaoRevisao({ rotulo, dica, valor, aoMudar, erro }: CampoObservacaoRevisaoProps) {
  return (
    <Campo rotulo={rotulo} dica={dica} erro={erro}>
      {({ atributos, classeErro }) => (
        <>
          <textarea {...atributos} rows={3} value={valor} onChange={(evento) => aoMudar(evento.target.value)} className={'input-padrao' + classeErro} />
          <ContadorCaracteres texto={valor} limite={OBSERVACAO_REVISAO_LIMITE} />
        </>
      )}
    </Campo>
  );
}
