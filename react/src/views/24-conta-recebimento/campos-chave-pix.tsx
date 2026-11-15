import { Campo } from '../../components/input/campo';
import { ORDEM_TIPO_CHAVE_PIX, ROTULO_TIPO_CHAVE_PIX } from '../../services/24-conta-recebimento/constants/conta-recebimento.constants';
import type { TipoChavePix } from '../../services/constant/type/enums-do-banco.gerado';

interface CamposChavePixProps {
  tipoChave: TipoChavePix;
  aoAlterarTipo: (tipo: TipoChavePix) => void;
  chave: string;
  aoAlterarChave: (chave: string) => void;
  // No Cadastro e no "Quero ser pesquisador" a chave é opcional (dá para cadastrar depois em Minha Conta > Financeiro).
  opcional?: boolean;
}

// Os campos da chave Pix (tipo e chave), os mesmos em todo lugar que pede a chave (16-11-2026, pedido da Alexia): a
// seção Recebimento da Minha Conta, o Cadastro como pesquisador e o "Quero ser pesquisador". A chave precisa estar no CPF
// do pesquisador: o sistema confere no diretório Pix ao salvar.
export function CamposChavePix({ tipoChave, aoAlterarTipo, chave, aoAlterarChave, opcional = false }: CamposChavePixProps) {
  return (
    <>
      <Campo rotulo="Tipo de chave">
        {({ atributos, classeErro }) => (
          <select
            {...atributos}
            value={tipoChave}
            onChange={(evento) => aoAlterarTipo(evento.target.value as TipoChavePix)}
            className={'input-padrao' + classeErro}
          >
            {ORDEM_TIPO_CHAVE_PIX.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ROTULO_TIPO_CHAVE_PIX[tipo]}
              </option>
            ))}
          </select>
        )}
      </Campo>
      <Campo
        rotulo={opcional ? 'Chave Pix para receber (opcional)' : 'Chave'}
        dica={
          opcional
            ? 'Para onde vai o dinheiro das suas campanhas. Precisa estar no seu CPF. Se preferir, cadastre depois em Minha Conta > Financeiro.'
            : undefined
        }
      >
        {({ atributos, classeErro }) => (
          <input {...atributos} value={chave} onChange={(evento) => aoAlterarChave(evento.target.value)} className={'input-padrao' + classeErro} />
        )}
      </Campo>
    </>
  );
}
