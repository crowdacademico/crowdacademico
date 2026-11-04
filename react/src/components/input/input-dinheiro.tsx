import type { InputHTMLAttributes } from 'react';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';

type InputDinheiroProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  // Reais com ponto decimal ("1234.50"), ou '' quando vazio: o formato que Number() e a API entendem.
  valor: string;
  aoMudar: (valor: string) => void;
};

// Valor em reais no estilo caixa registradora, o dos aplicativos de banco: cada dígito entra pela direita, nos
// centavos (1, 2, 3, 4, 5 mostra R$ 123,45). Colar "1.234,56" ou "1234.56" também serve: só os dígitos contam.
export function InputDinheiro({ valor, aoMudar, className = 'input-padrao', ...resto }: InputDinheiroProps) {
  const vazio = valor === '' || Number.isNaN(Number(valor));
  return (
    <input
      {...resto}
      type="text"
      inputMode="numeric"
      value={vazio ? '' : formatarMoeda(valor)}
      onChange={(evento) => {
        const digitos = evento.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);
        aoMudar(digitos === '' ? '' : (Number(digitos) / 100).toFixed(2));
      }}
      className={className}
    />
  );
}
