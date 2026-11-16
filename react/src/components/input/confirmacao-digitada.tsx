import { Campo } from './campo';

interface ConfirmacaoDigitadaProps {
  // O que digitar, com artigo: "o e-mail", "o título".
  oQue: string;
  esperado: string;
  valor: string;
  aoMudar: (valor: string) => void;
  // Cor do rótulo quando o campo fica sobre fundo colorido (ex.: "texto-erro" na caixa vermelha de excluir conta);
  // sem ela, o cinza padrão do rótulo não tem contraste sobre o fundo de erro.
  classeRotulo?: string;
}

// Campo da confirmação por digitação antes de uma ação sem volta (regra em confirmacao-confere.ts).
export function ConfirmacaoDigitada({ oQue, esperado, valor, aoMudar, classeRotulo }: ConfirmacaoDigitadaProps) {
  return (
    // overflow-wrap: anywhere: um e-mail longo é uma "palavra" só e vazava da caixa no celular (Alexia, 16-11-2026).
    // O valor a digitar sai em caixa normal (o rótulo é em maiúsculas, e um e-mail em maiúsculas parece outro e-mail).
    <Campo
      rotulo={
        <span className={classeRotulo}>
          {/* nowrap: o hífen de "e-mail" é ponto de quebra para o navegador, e a linha ficava "E-" / "MAIL:". */}
          Para confirmar, digite <span className="whitespace-nowrap">{oQue}:</span>
          <span className="block normal-case [overflow-wrap:anywhere]">{esperado}</span>
        </span>
      }
    >
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
