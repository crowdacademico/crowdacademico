import { useState } from 'react';
import type { ReactNode } from 'react';
import { Campo } from '../input/campo';
import { TelaCheia } from './tela-cheia';

interface CaixaTextoLongoProps {
  rotulo: string;
  // Título da barra da tela cheia (ex.: "Versão v3").
  tituloTelaCheia: string;
  valor: string;
  // Sem `aoMudar`, a caixa é só leitura (Consultar, versão travada).
  aoMudar?: (valor: string) => void;
  erro?: string;
  placeholder?: string;
  // Botões extras na linha do rótulo, à esquerda do "Tela cheia" (use `btn-pilula btn-pilula-rotulo`).
  extra?: ReactNode;
}

// Texto longo (termo de uso) num modal de altura cheia: a caixa estica até o fim do modal (o pai precisa ser coluna
// flex) e rola por dentro só quando o texto não cabe; "Tela cheia" na linha do rótulo; contagem de caracteres.
export function CaixaTextoLongo({ rotulo, tituloTelaCheia, valor, aoMudar, erro, placeholder, extra }: CaixaTextoLongoProps) {
  const [telaCheia, setTelaCheia] = useState(false);

  return (
    <div className="relative flex-1 flex flex-col">
      {!telaCheia && (
        // Na mesma linha do rótulo, com a mesma letra dele (.btn-pilula-rotulo).
        <div className="absolute right-0 -top-0.75 flex gap-2">
          {extra}
          <button type="button" onClick={() => setTelaCheia(true)} className="btn-pilula btn-pilula-rotulo">
            <i className="fa-solid fa-expand" aria-hidden="true"></i> Tela cheia
          </button>
        </div>
      )}
      <TelaCheia ativa={telaCheia} titulo={tituloTelaCheia} aoSair={() => setTelaCheia(false)}>
        <Campo rotulo={rotulo} erro={erro} className={'flex-1 flex flex-col' + (telaCheia ? '' : ' [&>label]:mb-3')}>
          {({ atributos }) => (
            <textarea
              {...atributos}
              value={valor}
              onChange={(evento) => aoMudar?.(evento.target.value)}
              readOnly={!aoMudar}
              placeholder={placeholder}
              className={'input-padrao input-padrao--codigo resize-none flex-1' + (telaCheia ? '' : ' input-padrao--pequeno min-h-64')}
            />
          )}
        </Campo>
        <p className="legenda texto-fraco mt-2">{valor.length} caracteres</p>
      </TelaCheia>
    </div>
  );
}
