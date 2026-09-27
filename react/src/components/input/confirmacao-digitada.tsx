import { Campo } from './campo';

interface ConfirmacaoDigitadaProps {
  // O que digitar, com artigo: "o e-mail", "o título".
  oQue: string;
  esperado: string;
  valor: string;
  aoMudar: (valor: string) => void;
}

// Campo da confirmação por digitação antes de uma ação sem volta (regra em confirmacao-confere.ts).
export function ConfirmacaoDigitada({ oQue, esperado, valor, aoMudar }: ConfirmacaoDigitadaProps) {
  return (
    <Campo rotulo={`Digite ${oQue} "${esperado}" para confirmar`}>
      {({ atributos }) => (
        <input
          {...atributos}
          type="text"
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          className="input-padrao"
          placeholder={esperado}
          autoComplete="off"
        />
      )}
    </Campo>
  );
}
