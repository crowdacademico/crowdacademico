import { useState } from 'react';
import { Campo } from '../../components/input/campo';
import { ORDEM_TIPO_CHAVE_PIX, ROTULO_TIPO_CHAVE_PIX } from '../../services/24-conta-recebimento/constants/conta-recebimento.constants';
import { ENTRADA_CHAVE_PIX, erroChavePix, mascararChavePix } from '../../services/24-conta-recebimento/util/chave-pix.util';
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
//
// Máscara pelo tipo (chave-pix.util.ts): no CPF só entram números, no máximo 11, já como 000.000.000-00; o mesmo para
// CNPJ, telefone e chave aleatória. Trocar o tipo apaga a chave, que não serviria no tipo novo. O erro (CPF com dígito
// errado, telefone sem DDD) aparece quando a pessoa sai do campo.
export function CamposChavePix({ tipoChave, aoAlterarTipo, chave, aoAlterarChave, opcional = false }: CamposChavePixProps) {
  const [saiuDoCampo, setSaiuDoCampo] = useState(false);
  const entrada = ENTRADA_CHAVE_PIX[tipoChave];
  const erro = saiuDoCampo ? erroChavePix(tipoChave, chave) : null;

  return (
    <>
      <Campo rotulo="Tipo de chave">
        {({ atributos, classeErro }) => (
          <select
            {...atributos}
            value={tipoChave}
            onChange={(evento) => {
              aoAlterarTipo(evento.target.value as TipoChavePix);
              aoAlterarChave('');
              setSaiuDoCampo(false);
            }}
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
        erro={erro ?? undefined}
        dica={
          opcional
            ? 'Para onde vai o dinheiro das suas campanhas. Precisa estar no seu CPF. Se preferir, cadastre depois em Minha Conta > Financeiro.'
            : undefined
        }
      >
        {({ atributos, classeErro }) => (
          <input
            {...atributos}
            type={tipoChave === 'email' ? 'email' : 'text'}
            inputMode={entrada.inputMode}
            placeholder={entrada.exemplo}
            autoComplete="off"
            value={chave}
            onChange={(evento) => aoAlterarChave(mascararChavePix(tipoChave, evento.target.value))}
            onBlur={() => setSaiuDoCampo(true)}
            className={'input-padrao' + classeErro}
          />
        )}
      </Campo>
    </>
  );
}
