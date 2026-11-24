import { Link } from 'react-router';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { enderecoVideoIncorporado } from '../../services/12-campanha/util/video-incorporado.util';
import type { AnexoAtualizacao, AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';

function dataPublicacao(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(valor));
}

interface ListaAtualizacoesProps {
  atualizacoes: AtualizacaoCampanhaResponse[];
  // Perfil do pesquisador: cada atualização mostra de qual campanha é (título com link).
  tituloCampanha?: (idCampanha: number) => string | undefined;
  // Perfil (21-11-2026): a campanha já terminou; a pílula avisa ao lado do título dela.
  campanhaEncerrada?: (idCampanha: number) => boolean;
}

// Arquivo de imagem enviado como anexo (o link e o PDF não são imagem).
const ehImagem = (anexo: AnexoAtualizacao) => anexo.tipo === 'arquivo' && (anexo.tipoMime ?? '').startsWith('image/');
// Link de YouTube ou Vimeo (os tipos de link de vídeo, 22-11-2026): toca na própria atualização.
const videoDoAnexo = (anexo: AnexoAtualizacao) => (anexo.tipo === 'link' ? enderecoVideoIncorporado(anexo.url) : null);
const vaiNaLista = (anexo: AnexoAtualizacao) => !ehImagem(anexo) && videoDoAnexo(anexo) === null;

// As atualizações em estilo blog: um artigo por atualização, com título, data, texto inteiro e anexos.
export function ListaAtualizacoes({ atualizacoes, tituloCampanha, campanhaEncerrada }: ListaAtualizacoesProps) {
  return (
    <ol className="flex flex-col gap-5">
      {atualizacoes.map((atualizacao) => {
        const campanha = tituloCampanha?.(atualizacao.idCampanha);
        return (
          <li key={atualizacao.idAtualizacao}>
            <article className="fundo-cartao border borda-padrao rounded-xl p-6">
              {/* "Campanha encerrada" no canto superior direito do card (23-11-2026); antes ficava solta no fim da linha
                  da data e quebrava torta no celular. */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="subtitulo min-w-0">{atualizacao.titulo}</h3>
                {campanha && campanhaEncerrada?.(atualizacao.idCampanha) && <span className="badge badge-neutro shrink-0">Campanha encerrada</span>}
              </div>
              <p className="legenda mt-2 texto-fraco">
                {dataPublicacao(atualizacao.publicadoEm)}
                {campanha && (
                  <>
                    {' · '}
                    <Link to={`/campanha/${atualizacao.idCampanha}`} className="texto-marca hover:underline">
                      {campanha}
                    </Link>                  </>
                )}
              </p>
              <p className="paragrafo texto-padrao mt-4 whitespace-pre-wrap">{atualizacao.conteudo}</p>
              {/* As imagens aparecem na própria atualização, como num blog (22-11-2026); antes eram só um link. Clicar abre a
                  imagem inteira numa aba nova. PDF e links continuam na lista abaixo. */}
              {atualizacao.anexos.some(ehImagem) && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {atualizacao.anexos.filter(ehImagem).map((anexo) => (
                    <a key={`img-${anexo.idAnexo}`} href={anexo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border borda-padrao">
                      <img src={anexo.url} alt={`Imagem da atualização: ${atualizacao.titulo}`} loading="lazy" className="w-full h-auto object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {/* Vídeo do YouTube ou do Vimeo anexado como link: toca aqui mesmo, como o vídeo da campanha. */}
              {atualizacao.anexos.map((anexo) => {
                const video = videoDoAnexo(anexo);
                return video ? (
                  <div key={`video-${anexo.idAnexo}`} className="mt-5 w-full aspect-video overflow-hidden rounded-lg border borda-padrao">
                    <iframe
                      src={video}
                      title={`Vídeo da atualização: ${atualizacao.titulo}`}
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : null;
              })}
              {atualizacao.anexos.some(vaiNaLista) && (
                <ul className="mt-5 flex flex-col gap-2 border-t borda-padrao pt-4">
                  {atualizacao.anexos.filter(vaiNaLista).map((anexo) => (
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
