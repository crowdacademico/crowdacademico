import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

// Texto que pode ser longo dentro de uma tabela (alvo, título, relato, comentário): ocupa uma linha só e, quando não
// cabe, ganha um "ler tudo" que expande a própria linha ("ler menos" recolhe). O corte é medido na tela, não por
// número de letras, então acompanha a largura da coluna e do aparelho. `semEspaco`: texto sem espaço (link, e-mail)
// pode quebrar em qualquer ponto; sem isso ele não quebra, vaza da coluna e o "ler tudo" nunca aparece.
// `link`: o texto vira link (ex.: título da campanha), sem perder o "ler tudo".
export function TextoResumido({ texto, semEspaco, link }: { texto: string | null; semEspaco?: boolean; link?: string }) {
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
    <span className={'texto-resumido' + (expandido ? ' texto-resumido--aberto' : '') + (semEspaco ? ' texto-resumido--sem-espaco' : '')}>
      <span ref={ref} className={expandido ? 'texto-resumido__inteiro' : 'texto-resumido__uma-linha'}>
        {link ? <Link to={link} className="link-texto">{texto}</Link> : texto}
      </span>
      {(cortado || expandido) && (
        <button type="button" className="link-texto texto-resumido__botao" aria-expanded={expandido} onClick={() => setExpandido((atual) => !atual)}>
          {expandido ? 'ler menos' : 'ler tudo'}
        </button>
      )}
    </span>
  );
}
