import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';
import { useDuvidasFrequentes } from './use-duvidas-frequentes';

// Todas as perguntas vêm de use-duvidas-frequentes.tsx (a Home usa a mesma fonte).
export function PerguntasFrequentes() {
  const duvidas = useDuvidasFrequentes();

  return (
    <div className="pagina-publica fundo-pagina min-h-full py-16">
      <div className="mx-auto max-w-3xl px-4">
        <CabecalhoPagina className="mb-10" titulo="Perguntas frequentes" descricao="O que mais perguntam sobre apoiar, acompanhar e submeter pesquisas no CrowdAcadêmico." />
        <div className="flex flex-col gap-3">
          {duvidas.map((duvida) => (
            <details key={duvida.chave} className="pagina-publica__faq">
              <summary>{duvida.pergunta}</summary>
              <p className="paragrafo texto-padrao mt-3">{duvida.resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}