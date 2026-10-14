import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Campo } from './campo';
import { Dica } from '../layout/tooltip';
import { textoSeguro } from '../../services/constant/util/formatacao.util';

// Valor que só se lê, na mesma caixa dos campos editáveis ao lado (alinha com eles). Ao tentar escrever, apagar ou
// colar, a dica "Apenas leitura" aparece em cima da caixa e some quando o foco sai. Passar o mouse não abre a dica.
export function CaixaSomenteLeitura({ rotulo, valor }: { rotulo: string; valor: unknown }) {
  const [tentouEscrever, setTentouEscrever] = useState(false);
  // Tecla que escreveria algo (letra, número, espaço) ou apagaria; Tab e as setas continuam só navegando.
  const aoTeclar = (evento: KeyboardEvent) => {
    if (evento.key.length === 1 || evento.key === 'Backspace' || evento.key === 'Delete') setTentouEscrever(true);
  };
  return (
    <Campo rotulo={rotulo}>
      {({ atributos }) => (
        <span className={'relative block' + (tentouEscrever ? ' dica--aberta' : '')}>
          <input
            {...atributos}
            type="text"
            readOnly
            value={textoSeguro(valor)}
            className="input-padrao"
            onKeyDown={aoTeclar}
            onPaste={() => setTentouEscrever(true)}
            onBlur={() => setTentouEscrever(false)}
          />
          <Dica texto="Apenas leitura" alerta />
        </span>
      )}
    </Campo>
  );
}
