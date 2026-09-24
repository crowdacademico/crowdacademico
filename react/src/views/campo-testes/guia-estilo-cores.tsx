import { useCallback, useState } from 'react';
import { comporSobre, LIMITE_TEXTO_AA, lerCor, paraHex, razaoContraste } from '../../services/campo-testes/util/contraste-cor.util';
import paresContraste from '../../services/campo-testes/constants/pares-contraste.json';
import { PainelTema } from './guia-estilo-temas';

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
        className="rounded px-3 py-1 text-sm font-bold"
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

// ---- Comparador do verde do texto no tema escuro ----

// Valores de EXPERIMENTO (não são tokens): candidatos para `--cor-texto-marca`
// no tema escuro. Escolhido um, a troca é uma linha em 1-cores.css.
const CANDIDATOS_VERDE = ['#1fae66', '#2fbf71', '#3ecf8e', '#4ade80'];

function LinhaVerde({ rotulo, cor }: { rotulo: string; cor: string }) {
  const [razoes, setRazoes] = useState<{ cartao: number; pagina: number } | null>(null);
  const medir = useCallback((linha: HTMLElement | null) => {
    if (!linha) {
      return;
    }
    const texto = comporSobre(lerCor(getComputedStyle(linha.querySelector('[data-amostra]') ?? linha).color), [0, 0, 0, 1]);
    const cartao = comporSobre(lerCor(getComputedStyle(linha).backgroundColor), [0, 0, 0, 1]);
    const painel = linha.closest('[data-tema-local]') ?? linha;
    const pagina = comporSobre(lerCor(getComputedStyle(painel).backgroundColor), [0, 0, 0, 1]);
    setRazoes({ cartao: razaoContraste(texto, cartao), pagina: razaoContraste(texto, pagina) });
  }, []);

  return (
    <div ref={medir} className="fundo-cartao flex flex-wrap items-center gap-3 rounded-lg border borda-padrao p-3">
      <span className="paragrafo-denso w-40 shrink-0">{rotulo}</span>
      <span data-amostra style={{ color: cor }} className="min-w-0 flex-1">
        <span className="text-xs">Texto pequeno de marca. </span>
        <span className="text-base font-bold">Texto de marca em negrito </span>
        <span className="text-sm underline">link</span>
      </span>
      {razoes && (
        <span className="flex gap-1">
          {([['cartão', razoes.cartao], ['página', razoes.pagina]] as const).map(([onde, razao]) => (
            <span key={onde} className={`badge ${razao >= LIMITE_TEXTO_AA ? 'badge-sucesso' : 'badge-erro'}`}>
              {onde} {formatarRazao(razao)}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

export function ComparadorVerdeTexto() {
  const [personalizada, setPersonalizada] = useState('#2fbf71');

  return (
    <PainelTema tema="escuro" titulo="Tema escuro: candidatos para o texto verde">
      <div className="space-y-2">
        <LinhaVerde rotulo="Atual (texto-marca)" cor="var(--cor-texto-marca)" />
        {CANDIDATOS_VERDE.map((hex) => (
          <LinhaVerde key={hex} rotulo={hex} cor={hex} />
        ))}
        <LinhaVerde key={personalizada} rotulo={personalizada} cor={personalizada} />
        <label className="flex items-center gap-2 text-sm texto-padrao">
          <input type="color" value={personalizada} onChange={(evento) => setPersonalizada(evento.target.value)} />
          Testar outra cor
        </label>
        <p className="legenda">
          Para aplicar: troque <code>--cor-texto-marca</code> no bloco escuro de <code>1-cores.css</code> e rode{' '}
          <code>npm run contraste</code>.
        </p>
      </div>
    </PainelTema>
  );
}
