import { ModalTermo } from '../../components/crud/modal-termo';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { ROTULO_TIPO_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos.constants';
import type { TermoUsoResponse } from '../../services/5-termo-uso/type/termo-uso.type';
import { etiquetasTermoUso } from './etiquetas-termo-uso';

interface ModalConsultarTermoUsoProps {
  termo: TermoUsoResponse;
  aoFechar: () => void;
}

// Consultar: a linha da lista já traz o texto inteiro, então não busca nada. O modal de termo do Criar conta.
export function ModalConsultarTermoUso({ termo, aoFechar }: ModalConsultarTermoUsoProps) {
  return (
    <ModalTermo
      titulo={`Termo de Uso - ${ROTULO_TIPO_TERMO[termo.tipo]}`}
      versao={termo.versao}
      conteudo={termo.conteudo}
      badges={etiquetasTermoUso(termo)}
      aoFechar={aoFechar}
      rodape={<RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />}
    />
  );
}
