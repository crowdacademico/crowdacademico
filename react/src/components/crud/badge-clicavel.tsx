// Pílula de situação que abre os detalhes (21-11-2026, teste com usuários): a pessoa não sabia o desfecho de uma
// denúncia nem por que uma atualização saiu do ar. A própria pílula da coluna Situação vira o botão, com a mesma cor,
// um ícone de "abrir" e borda, sublinhado ao passar o mouse e o anel de foco do resto do sistema, para parecer
// clicável sem criar mais uma ação na linha. `dica`: o que o clique mostra (vai também no nome acessível).
interface BadgeClicavelProps {
  classe: string;
  rotulo: string;
  dica: string;
  aoClicar: () => void;
}

export function BadgeClicavel({ classe, rotulo, dica, aoClicar }: BadgeClicavelProps) {
  return (
    <button
      type="button"
      className={`badge ${classe} badge--clicavel foco-marca`}
      onClick={aoClicar}
      aria-label={`${rotulo}: ${dica}`}
    >
      {rotulo}
      <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
    </button>
  );
}
