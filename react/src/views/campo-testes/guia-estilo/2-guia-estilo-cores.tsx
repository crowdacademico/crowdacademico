import { useCallback, useState } from 'react';
import { comporSobre, LIMITE_TEXTO_AA, lerCor, paraHex, razaoContraste } from './5-contraste-cor.util';
import paresContraste from './6-pares-contraste.json';

const formatarRazao = (razao: number) => razao.toFixed(2).replace('.', ',') + ':1';

// Cor final na tela: a cor do elemento composta sobre o fundo opaco do pai (o
// cartão), porque vários fundos de estado são translúcidos no tema escuro.
function corNaTela(elemento: HTMLElement, propriedade: 'color' | 'backgroundColor') {
  const fundoPai = comporSobre(lerCor(getComputedStyle(elemento.parentElement ?? elemento).backgroundColor), [0, 0, 0, 1]);
  const estilo = getComputedStyle(elemento);
  const fundo = comporSobre(lerCor(estilo.backgroundColor), [...fundoPai, 1]);
  return propriedade === 'backgroundColor' ? fundo : comporSobre(lerCor(estilo.color), [...fundo, 1]);
}

const nomeCurto = (token: string) => token.replace('--cor-', '');

// ---- Pares texto/fundo (a mesma lista do `npm run contraste`) ----

function LinhaPar({ texto, fundo }: { texto: string; fundo: string }) {
  const [razao, setRazao] = useState<number | null>(null);
  const medir = useCallback(
    (amostra: HTMLElement | null) => {
      if (amostra) {
        setRazao(razaoContraste(corNaTela(amostra, 'color'), corNaTela(amostra, 'backgroundColor')));
      }
    },
    [],
  );
  const passou = razao !== null && razao >= LIMITE_TEXTO_AA;

  return (
    <div className="fundo-cartao flex items-center gap-3 rounded-lg border borda-padrao p-2">
      <span
        ref={medir}
        className="rounded px-3 py-1 paragrafo-destaque texto-herdado"
        style={{ color: `var(${texto})`, backgroundColor: `var(${fundo})` }}
      >
        Aa
      </span>
      <span className="paragrafo-denso min-w-0 flex-1 break-words">
        {nomeCurto(texto)} sobre {nomeCurto(fundo)}
      </span>
      {razao !== null && (
        <span className={`badge ${passou ? 'badge-sucesso' : 'badge-erro'}`}>{formatarRazao(razao)}</span>
      )}
    </div>
  );
}

// ---- Amostras de cor sem par de texto (superfícies, marca, bordas) ----

const GRUPOS_AMOSTRA: { titulo: string; tokens: string[] }[] = [
  { titulo: 'Superfícies', tokens: ['--cor-fundo-pagina', '--cor-fundo-cartao', '--cor-fundo-elevado', '--cor-fundo-sutil', '--cor-fundo-hover'] },
  { titulo: 'Marca', tokens: ['--cor-marca', '--cor-marca-escura', '--cor-fundo-marca-forte', '--cor-texto-marca'] },
  { titulo: 'Bordas', tokens: ['--cor-borda', '--cor-borda-forte', '--cor-borda-erro', '--cor-borda-sucesso'] },
  { titulo: 'Estados (fundo)', tokens: ['--cor-fundo-sucesso', '--cor-fundo-erro', '--cor-fundo-aviso', '--cor-fundo-info'] },
];

function Amostra({ token }: { token: string }) {
  const [hex, setHex] = useState('');
  const medir = useCallback((quadrado: HTMLElement | null) => {
    if (quadrado) {
      setHex(paraHex(corNaTela(quadrado, 'backgroundColor')));
    }
  }, []);

  return (
    <div className="fundo-cartao flex items-center gap-2 rounded-lg border borda-padrao p-2">
      <span ref={medir} className="h-6 w-6 shrink-0 rounded border borda-forte" style={{ backgroundColor: `var(${token})` }} />
      <span className="paragrafo-denso min-w-0 break-words">
        {nomeCurto(token)} {hex}
      </span>
    </div>
  );
}

export function CoresDoSistema() {
  return (
    <div className="space-y-4">
      <div>
        <p className="rotulo-leitura mb-2">Texto sobre fundo (mínimo 4,5:1)</p>
        <div className="space-y-2">
          {(paresContraste as [string, string][]).map(([texto, fundo]) => (
            <LinhaPar key={`${texto}|${fundo}`} texto={texto} fundo={fundo} />
          ))}
        </div>
      </div>
      {GRUPOS_AMOSTRA.map(({ titulo, tokens }) => (
        <div key={titulo}>
          <p className="rotulo-leitura mb-2">{titulo}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {tokens.map((token) => (
              <Amostra key={token} token={token} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
