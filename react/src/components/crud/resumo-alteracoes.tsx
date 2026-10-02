// Frase do rodapé dos modais de Alterar: diz o que mudou e ainda não foi salvo, ou que não há nada a salvar.
export function ResumoAlteracoes({ mudancas }: { mudancas: string[] }) {
  return (
    <p className={'paragrafo texto-herdado ' + (mudancas.length ? 'texto-aviso enfase' : 'texto-fraco')}>
      {mudancas.length
        ? `${mudancas.length} ${mudancas.length === 1 ? 'alteração não salva' : 'alterações não salvas'}: ${mudancas.join(', ')}.`
        : 'Nenhuma alteração para salvar.'}
    </p>
  );
}
