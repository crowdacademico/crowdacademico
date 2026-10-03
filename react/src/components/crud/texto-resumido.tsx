import { useState } from 'react';
import { ModalDetalhe } from './modal-detalhe';

interface TextoResumidoProps {
  texto: string | null;
  // Título do modalzinho que mostra o texto inteiro (ex.: "Comentário de Ana Beatriz").
  titulo: string;
  limite?: number;
}

// Texto livre dentro de uma tabela (comentário, relato, justificativa): mostra o começo e, se passar do limite, um
// "ler tudo" que abre o texto inteiro num modal. Assim um texto longo não estica a linha da tabela.
export function TextoResumido({ texto, titulo, limite = 90 }: TextoResumidoProps) {
  const [aberto, setAberto] = useState(false);
  if (!texto) {
    return <>-</>;
  }
  if (texto.length <= limite) {
    return <>{texto}</>;
  }
  return (
    <>
      {texto.slice(0, limite).trimEnd()}...{' '}
      <button type="button" className="link-texto" onClick={() => setAberto(true)}>
        ler tudo
      </button>
      {aberto && (
        <ModalDetalhe titulo={titulo} secoes={[{ titulo: 'Texto completo', conteudo: <p className="paragrafo whitespace-pre-line">{texto}</p> }]} aoFechar={() => setAberto(false)} />
      )}
    </>
  );
}
