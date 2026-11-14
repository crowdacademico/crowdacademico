import { Link } from 'react-router';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { ROTULO_FASE_ATUALIZACAO } from '../../services/15-atualizacao-campanha/constants/atualizacao-campanha.constants';
import type { AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';

function dataPublicacao(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(valor));
}

interface ListaAtualizacoesProps {
  atualizacoes: AtualizacaoCampanhaResponse[];
  // Perfil do pesquisador: cada atualização mostra de qual campanha é (título com link).
  tituloCampanha?: (idCampanha: number) => string | undefined;
}

// As atualizações em estilo blog: um artigo por atualização, com fase, título, data, texto inteiro e anexos.
export function ListaAtualizacoes({ atualizacoes, tituloCampanha }: ListaAtualizacoesProps) {
  return (
    <ol className="flex flex-col gap-5">
      {atualizacoes.map((atualizacao) => {
        const campanha = tituloCampanha?.(atualizacao.idCampanha);
        return (
          <li key={atualizacao.idAtualizacao}>
            <article className="fundo-cartao border borda-padrao rounded-xl p-6">
              <p className="rotulo-leitura texto-marca mb-2">{ROTULO_FASE_ATUALIZACAO[atualizacao.fase]}</p>
              <h3 className="subtitulo">{atualizacao.titulo}</h3>
              <p className="legenda mt-2">
                {dataPublicacao(atualizacao.publicadoEm)}
                {campanha && (
                  <>
                    {' · '}
                    <Link to={`/campanha/${atualizacao.idCampanha}`} className="texto-marca hover:underline">
                      {campanha}
                    </Link>
                  </>
                )}
              </p>
              <p className="paragrafo texto-padrao mt-4 whitespace-pre-wrap">{atualizacao.conteudo}</p>
              {atualizacao.anexos.length > 0 && (
                <ul className="mt-5 flex flex-col gap-2 border-t borda-padrao pt-4">
                  {atualizacao.anexos.map((anexo) => (
                    <li key={`${anexo.tipo}-${anexo.idAnexo}`}>
                      <a href={anexo.url} target="_blank" rel="noreferrer" className="paragrafo texto-marca hover:underline">
                        <i className="fa-solid fa-arrow-up-right-from-square mr-2" aria-hidden="true" />
                        {anexo.nome}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

interface ModalAtualizacoesProps {
  titulo: string;
  atualizacoes: AtualizacaoCampanhaResponse[];
  erro: boolean;
  aoFechar: () => void;
}

// Atualizações da campanha num modal, estilo blog (ideia da Alexia, 14-11-2026): rápido de abrir e de ler sem sair
// da página da campanha.
export function ModalAtualizacoes({ titulo, atualizacoes, erro, aoFechar }: ModalAtualizacoesProps) {
  return (
    <ModalFicha titulo="Atualizações" subtitulo={titulo} aoFechar={aoFechar} fecharAoClicarFora>
      {erro && <p className="paragrafo texto-fraco">Não foi possível carregar as atualizações.</p>}
      {!erro && atualizacoes.length === 0 && (
        <p className="paragrafo texto-fraco">Ainda não há atualizações. Quando o pesquisador publicar novidades, elas aparecem aqui.</p>
      )}
      {!erro && atualizacoes.length > 0 && <ListaAtualizacoes atualizacoes={atualizacoes} />}
    </ModalFicha>
  );
}
