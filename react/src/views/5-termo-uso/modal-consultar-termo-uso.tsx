import { CaixaTextoLongo } from '../../components/crud/caixa-texto-longo';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { ROTULO_TIPO_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos.constants';
import { formatarData } from '../../services/constant/util/formatacao.util';
import type { TermoUsoResponse } from '../../services/5-termo-uso/type/termo-uso.type';
import { etiquetasTermoUso } from './etiquetas-termo-uso';

interface ModalConsultarTermoUsoProps {
  termo: TermoUsoResponse;
  aoFechar: () => void;
}

// Consultar: a linha da lista já traz o texto inteiro, então não busca nada. Mesmo visual do Alterar, só leitura.
export function ModalConsultarTermoUso({ termo, aoFechar }: ModalConsultarTermoUsoProps) {
  return (
    <ModalFicha
      titulo={`Termo de Uso - ${ROTULO_TIPO_TERMO[termo.tipo]}`}
      badges={etiquetasTermoUso(termo)}
      variasTelas
      aoFechar={aoFechar}
      rodape={
        <div className="flex justify-end">
          <button type="button" onClick={aoFechar} className="btn btn-secondary">
            Fechar
          </button>
        </div>
      }
    >
      <p className="text-xs texto-fraco">Criada em {formatarData(termo.criadoEm)}</p>
      <CaixaTextoLongo rotulo="Texto completo" tituloTelaCheia={`Versão ${termo.versao}`} valor={termo.conteudo} />
    </ModalFicha>
  );
}
