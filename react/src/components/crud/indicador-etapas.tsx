export interface EtapaIndicador<C extends string> {
  chave: C;
  rotulo: string;
}

interface IndicadorEtapasProps<C extends string> {
  etapas: readonly EtapaIndicador<C>[];
  atual: C;
  // Sem isto, o indicador só mostra onde a pessoa está. Com isto, cada etapa liberada vira um botão.
  aoEscolher?: (chave: C) => void;
  // Etapa que ainda não pode ser aberta (ex.: Orçamento antes de a campanha existir): aparece, mas não clica.
  liberada?: (chave: C) => boolean;
}

// Indicador de etapas de um passo a passo (padrão "stepper" de mercado): número de cada etapa ligado por uma
// linha, a atual em destaque, as anteriores com ✓. Discreto de propósito: mostra onde a pessoa está e quanto
// falta, sem competir com o formulário.
export function IndicadorEtapas<C extends string>({ etapas, atual, aoEscolher, liberada }: IndicadorEtapasProps<C>) {
  const indiceAtual = etapas.findIndex((etapa) => etapa.chave === atual);
  return (
    <ol className="indicador-etapas" aria-label="Etapas">
      {etapas.map((etapa, indice) => {
        const estado = indice < indiceAtual ? 'feita' : indice === indiceAtual ? 'atual' : 'futura';
        const clicavel = Boolean(aoEscolher) && indice !== indiceAtual && (liberada?.(etapa.chave) ?? true);
        const conteudo = (
          <>
            <span className="indicador-etapas__numero" aria-hidden="true">
              {estado === 'feita' ? <i className="fa-solid fa-check" aria-hidden="true"></i> : indice + 1}
            </span>
            <span className="indicador-etapas__rotulo">{etapa.rotulo}</span>
          </>
        );
        return (
          <li
            key={etapa.chave}
            className={`indicador-etapas__etapa indicador-etapas__etapa--${estado}`}
            aria-current={estado === 'atual' ? 'step' : undefined}
          >
            {clicavel ? (
              <button type="button" className="indicador-etapas__botao" onClick={() => aoEscolher?.(etapa.chave)}>
                {conteudo}
              </button>
            ) : (
              <span className="indicador-etapas__botao">{conteudo}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
