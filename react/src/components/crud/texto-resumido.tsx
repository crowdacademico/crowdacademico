import { useLayoutEffect, useRef, useState } from 'react';

// Texto que pode ser longo dentro de uma tabela (alvo, título, relato, comentário): ocupa uma linha só e, quando não
// cabe, ganha um "ler tudo" que expande a própria linha ("ler menos" recolhe). O corte é medido na tela, não por
// número de letras, então acompanha a largura da coluna e do aparelho.
export function TextoResumido({ texto }: { texto: string | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [cortado, setCortado] = useState(false);
  const [expandido, setExpandido] = useState(false);

  useLayoutEffect(() => {
    const elemento = ref.current;
    if (!elemento || expandido) {
      return;
    }
    const medir = () => setCortado(elemento.scrollHeight > elemento.clientHeight + 1);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [texto, expandido]);

  if (!texto) {
    return <>-</>;
  }
  return (
    <span className={expandido ? 'texto-resumido texto-resumido--aberto' : 'texto-resumido'}>
      <span ref={ref} className={expandido ? 'texto-resumido__inteiro' : 'texto-resumido__uma-linha'}>
        {texto}
      </span>
      {(cortado || expandido) && (
        <button type="button" className="link-texto texto-resumido__botao" aria-expanded={expandido} onClick={() => setExpandido((atual) => !atual)}>
          {expandido ? 'ler menos' : 'ler tudo'}
        </button>
      )}
    </span>
  );
}
