import type { ReactNode } from 'react';
import { Breadcrumb } from './breadcrumb';

interface CabecalhoPaginaProps {
  titulo: string;
  descricao?: string;
  className?: string;
  id?: string;
  // A descrição ocupa a largura toda da página, em vez de parar em 768 px (o Sobre, 22-11-2026).
  descricaoLarga?: boolean;
  // Na mesma linha do título, encostada à direita (ex.: o botão de grade e lista das Perguntas frequentes, 22-11-2026).
  // Quem passa decide em que larguras aparece.
  acaoTitulo?: ReactNode;
  children?: ReactNode;
}

export function CabecalhoPagina({
  titulo,
  descricao,
  className = '',
  id,
  descricaoLarga = false,
  acaoTitulo,
  children,
}: CabecalhoPaginaProps) {
  return (
    <header className={className} id={id}>
      <Breadcrumb noCabecalho />
      {acaoTitulo ? (
        <div className="flex items-center justify-between gap-4">
          <h1 className="titulo-pagina">{titulo}</h1>
          {acaoTitulo}
        </div>
      ) : (
        <h1 className="titulo-pagina">{titulo}</h1>
      )}
      {descricao && <p className={'paragrafo texto-padrao mt-4' + (descricaoLarga ? '' : ' max-w-3xl')}>{descricao}</p>}
      {children}
    </header>
  );
}
