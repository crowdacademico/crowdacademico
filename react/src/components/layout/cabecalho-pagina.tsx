import type { ReactNode } from 'react';
import { Breadcrumb } from './breadcrumb';

interface CabecalhoPaginaProps {
  titulo: string;
  descricao?: string;
  className?: string;
  id?: string;
  children?: ReactNode;
}

export function CabecalhoPagina({
  titulo,
  descricao,
  className = '',
  id,
  children,
}: CabecalhoPaginaProps) {
  return (
    <header className={className} id={id}>
      <Breadcrumb noCabecalho />
      <h1 className="titulo-pagina">{titulo}</h1>
      {descricao && <p className="paragrafo texto-padrao mt-4 max-w-3xl">{descricao}</p>}
      {children}
    </header>
  );
}
