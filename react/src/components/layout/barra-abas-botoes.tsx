// Barra de abas que troca o conteúdo na mesma tela (sem mudar o endereço): Dashboard e Alterar Usuário. A barra de
// Minha Conta é outra coisa (cada aba é uma rota, com NavLink). Mesmo visual das duas: classe `barra-abas`.
//
// role="tablist"/"tab" e aria-selected: o leitor de tela anuncia "aba 2 de 4, selecionada".
export interface AbaBotao<Chave extends string> {
  chave: Chave;
  rotulo: string;
  icone?: string;
}

interface BarraAbasBotoesProps<Chave extends string> {
  abas: AbaBotao<Chave>[];
  ativa: Chave;
  aoTrocar: (chave: Chave) => void;
  className?: string;
}

export function BarraAbasBotoes<Chave extends string>({ abas, ativa, aoTrocar, className = '' }: BarraAbasBotoesProps<Chave>) {
  return (
    <div role="tablist" className={'barra-abas gap-1 ' + className}>
      {abas.map((aba) => (
        <button
          key={aba.chave}
          type="button"
          role="tab"
          aria-selected={ativa === aba.chave}
          onClick={() => aoTrocar(aba.chave)}
          className={
            'paragrafo-destaque px-4 py-2.5 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors texto-herdado ' +
            (ativa === aba.chave ? 'borda-marca texto-marca' : 'border-transparent texto-fraco hover-texto-forte')
          }
        >
          {aba.icone && <i className={'fa-solid ' + aba.icone} aria-hidden="true"></i>}
          {aba.rotulo}
        </button>
      ))}
    </div>
  );
}
