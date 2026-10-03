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
  const texto = `Digite ${oQue} "${esperado}" para confirmar`;
  return (
    <Campo rotulo={classeRotulo ? <span className={classeRotulo}>{texto}</span> : texto}>
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
