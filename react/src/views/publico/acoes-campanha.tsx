import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { useToast } from '../../components/layout/toast/use-toast';
import { ModalDenunciar } from '../19-denuncia/modal-denunciar';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { seguirCampanhaApi } from '../../services/16-seguir/api/seguir-campanha.api';
import { comentarioApi } from '../../services/17-comentario/api/comentario.api';
import type { ComentarioMeuResponse } from '../../services/17-comentario/type/comentario.type';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { STATUS_ACEITA_DENUNCIA } from '../../services/12-campanha/constants/status-campanha.constants';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';
import { API_BASE_URL } from '../../services/constant/constants/api.constants';
import { useSeguirCampanhas } from './use-seguir-campanhas';
import { CartaoEndosso } from './cartao-endosso';
import { Tooltip } from '../../components/layout/tooltip';
import { pedirConfirmacao } from '../../components/crud/confirmacao';

interface AcoesCampanhaProps {
  auth: UseAuthReturn;
  campanha: CampanhaResponse;
}

// Seguir (com a contagem pública de seguidores), compartilhar e denunciar, no cartão lateral da página da campanha.
// Só para campanha publicada: a página não chama este cartão para rascunho, em análise ou rejeitada.
export function CartaoAcoesCampanha({ auth, campanha }: AcoesCampanhaProps) {
  const { idCampanha } = campanha;
  const { mostrar } = useToast();
  const { seguidas, carregando, emAtualizacao, alternarSeguir } = useSeguirCampanhas(auth);
  const [resultadoSeguidores, setResultadoSeguidores] = useState<{ id: number; total: number | null } | null>(null);
  const [versaoContagem, setVersaoContagem] = useState(0);
  const [denunciando, setDenunciando] = useState(false);
  const [denunciada, setDenunciada] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let ativo = true;
    seguirCampanhaApi
      .contarSeguidores(auth.authFetch, idCampanha)
      .then((resultado) => {
        if (ativo) setResultadoSeguidores({ id: idCampanha, total: resultado.seguidores });
      })
      .catch(() => {
        if (ativo) setResultadoSeguidores({ id: idCampanha, total: null });
      });
    return () => {
      ativo = false;
    };
  }, [auth.authFetch, idCampanha, versaoContagem]);

  const seguidores = resultadoSeguidores?.id === idCampanha ? resultadoSeguidores.total : undefined;
  const ehDono = auth.usuario?.idUsuario === campanha.idUsuario;
  const segue = seguidas.has(idCampanha);
  const ocupado = carregando || emAtualizacao.has(idCampanha);
  // O link compartilhado é o da prévia (Nest, GET /compartilhar/campanha/:id): o robô do WhatsApp/LinkedIn/X lê dali o
  // título e a capa (Open Graph), e quem clica é mandado na hora para a página da campanha.
  const endereco = `${API_BASE_URL.replace(/\/+$/, '')}/compartilhar/campanha/${idCampanha}`;
  const textoCompartilhar = `Apoie a pesquisa "${campanha.titulo}" no CrowdAcadêmico`;
  const podeCompartilharNativo = typeof navigator.share === 'function';

  async function seguir(): Promise<void> {
    await alternarSeguir(idCampanha, campanha.titulo);
    setVersaoContagem((versao) => versao + 1);
  }

  async function copiarLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(endereco);
      mostrar('Link copiado.');
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      mostrar('Não foi possível copiar. Copie o endereço pela barra do navegador.', undefined, 'erro');
    }
  }

  async function compartilharNativo(): Promise<void> {
    try {
      await navigator.share({ title: campanha.titulo, text: textoCompartilhar, url: endereco });
    } catch {
      // A pessoa fechou a janela de compartilhar: não é erro.
    }
  }

  const textoUrl = encodeURIComponent(`${textoCompartilhar}: ${endereco}`);
  const redes = [
    { rotulo: 'WhatsApp', icone: 'fa-brands fa-whatsapp', href: `https://wa.me/?text=${textoUrl}` },
    {
      rotulo: 'Facebook',
      icone: 'fa-brands fa-facebook-f',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(endereco)}`,
    },
    {
      rotulo: 'LinkedIn',
      icone: 'fa-brands fa-linkedin',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(endereco)}`,
    },
    {
      rotulo: 'X',
      icone: 'fa-brands fa-x-twitter',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(textoCompartilhar)}&url=${encodeURIComponent(endereco)}`,
    },
  ];

  return (
    <section className="cartao fundo-cartao border borda-padrao rounded-xl p-6 space-y-5" aria-label="Acompanhar e compartilhar">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm texto-padrao">
          <i className="fa-solid fa-users texto-fraco mr-2" aria-hidden="true" />
          <span className="numero font-bold texto-forte">
            {seguidores === undefined ? '…' : seguidores === null ? '—' : seguidores}
          </span>{' '}
          {seguidores === 1 ? 'pessoa segue' : 'pessoas seguem'}
        </p>
        {!ehDono && (
          <button
            type="button"
            onClick={() => void seguir()}
            disabled={ocupado}
            aria-pressed={segue}
            className={`btn justify-center min-w-[7.5rem] ${segue ? 'btn-secondary' : 'btn-primary'} text-sm`}
          >
            <i className={`fa-${segue ? 'solid' : 'regular'} fa-bell icone-sino`} aria-hidden="true" />
            {segue ? 'Seguindo' : 'Seguir'}
          </button>
        )}
      </div>
      {!auth.autenticado && (
        <p className="legenda -mt-3 texto-fraco">Entre na sua conta para seguir e receber as novidades desta campanha.</p>
      )}

      {/* Compartilhar (16-11-2026): a fileira de ícones redondos de quase todo site de financiamento coletivo e de notícia.
          Os logos das redes se reconhecem sem texto; o nome vai na dica do mouse e para o leitor de tela. No celular, o
          primeiro botão abre o compartilhar do próprio aparelho (todas as redes e apps dele). */}
      <div className="border-t borda-padrao pt-5">
        <h2 className="rotulo mb-3">Compartilhar</h2>
        <div className="flex flex-wrap items-center gap-2">
          {podeCompartilharNativo && (
            <button
              type="button"
              onClick={() => void compartilharNativo()}
              className="botao-compartilhar"
              aria-label="Compartilhar pelo celular"
              title="Compartilhar pelo celular"
            >
              <i className="fa-solid fa-share-nodes" aria-hidden="true" />
            </button>
          )}
          {redes.map((rede) => (
            <a
              key={rede.rotulo}
              href={rede.href}
              target="_blank"
              rel="noreferrer noopener"
              className={`botao-compartilhar botao-compartilhar--${rede.rotulo.toLowerCase()}`}
              aria-label={`Compartilhar no ${rede.rotulo} (abre em nova aba)`}
              title={`Compartilhar no ${rede.rotulo}`}
            >
              <i className={rede.icone} aria-hidden="true" />
            </a>
          ))}
          <button
            type="button"
            onClick={() => void copiarLink()}
            className="botao-compartilhar"
            aria-label={copiado ? 'Link copiado' : 'Copiar o link da campanha'}
            title={copiado ? 'Link copiado' : 'Copiar link'}
          >
            <i className={`fa-solid ${copiado ? 'fa-check texto-sucesso' : 'fa-link'}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!ehDono && STATUS_ACEITA_DENUNCIA.has(campanha.status) && (
        <div className="border-t borda-padrao pt-4">
          {denunciada ? (
            <p className="legenda texto-fraco" role="status">Denúncia registrada. A moderação vai analisar.</p>
          ) : auth.autenticado ? (
            <button type="button" onClick={() => setDenunciando(true)} className="text-sm texto-fraco hover:underline">
              <i className="fa-solid fa-flag mr-2" aria-hidden="true" />
              Denunciar esta campanha
            </button>
          ) : (
            <Link to="/login" state={{ voltarPara: `/campanha/${campanha.idCampanha}` }} className="text-sm texto-fraco hover:underline">
              <i className="fa-solid fa-flag mr-2" aria-hidden="true" />
              Entre na sua conta para denunciar esta campanha
            </Link>
          )}
        </div>
      )}

      {denunciando && (
        <ModalDenunciar
          authFetch={auth.authFetch}
          alvo={{ idCampanhaAlvo: idCampanha }}
          nomeAlvo={campanha.titulo}
          aoFechar={() => setDenunciando(false)}
          aoDenunciado={() => {
            setDenunciando(false);
            setDenunciada(true);
          }}
        />
      )}
    </section>
  );
}

// RF-096 e RF-100: pesquisador comenta campanha de OUTRO pesquisador, um comentário por campanha, com limite
// configurável. Mora no modal Comentar da página da campanha (22-11-2026). Com o comentário já feito, mostra a prévia
// (o mesmo cartão do bloco Endosso, como no Alterar Comentário do Estúdio) e deixa alterar o texto e apagar (exclusão
// lógica: o comentário sai do ar e a vaga volta) só enquanto não estiver endossado (RF-100; o banco também recusa). As regras finais (perfil ativo,
// campanha aceita comentário, um por campanha) são do banco: aqui só se evita o envio óbvio errado.
export function FormComentarCampanha({ auth, campanha }: AcoesCampanhaProps) {
  const { mostrar } = useToast();
  const limite = useConfiguracoes().obterNumero('limite_caracteres_comentario', 500);
  const [meus, setMeus] = useState<{ chave: string; lista: ComentarioMeuResponse[] } | null>(null);
  const [texto, setTexto] = useState('');
  // Alterando o comentário que já existe (o mesmo campo de texto da criação, já preenchido).
  const [alterando, setAlterando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ehPesquisador = auth.usuario?.ehPesquisador === true;
  const ehDono = auth.usuario?.idUsuario === campanha.idUsuario;
  const aceitaComentario = campanha.status !== 'encerrado_moderacao' && campanha.status !== 'rejeitado';
  const podeComentar = auth.autenticado && ehPesquisador && !ehDono && aceitaComentario;
  const chave = `${auth.usuario?.idUsuario ?? 0}:${campanha.idCampanha}`;

  useEffect(() => {
    if (!podeComentar) return;
    let ativo = true;
    comentarioApi
      .listarMinhas(auth.authFetch)
      .then((lista) => {
        if (ativo) setMeus({ chave, lista });
      })
      .catch(() => {
        if (ativo) setMeus({ chave, lista: [] });
      });
    return () => {
      ativo = false;
    };
  }, [auth.authFetch, chave, podeComentar]);

  if (!auth.autenticado || ehDono || !aceitaComentario) return null;
  if (!ehPesquisador) {
    return (
      <p className="legenda texto-fraco">
        Pesquisadores podem comentar campanhas de outros pesquisadores. O comentário aparece aqui quando o autor da
        campanha o endossa.
      </p>
    );
  }

  // Só o que está no ar: o comentário apagado não ocupa mais a vaga.
  const meuComentario =
    meus?.chave === chave ? meus.lista.find((item) => item.idCampanha === campanha.idCampanha && item.ativo) : undefined;
  const carregandoMeus = meus?.chave !== chave;
  const tamanho = texto.trim().length;

  const trocarMeu = (novo: ComentarioMeuResponse | null) =>
    setMeus({
      chave,
      lista: [
        ...(meus?.lista ?? []).filter((item) => item.idCampanha !== campanha.idCampanha),
        ...(novo ? [novo] : []),
      ],
    });

  async function enviar(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    if (enviando || tamanho === 0 || tamanho > limite) return;
    setEnviando(true);
    setErro(null);
    try {
      if (alterando && meuComentario) {
        const alterado = await comentarioApi.alterarConteudo(auth.authFetch, meuComentario.idComentario, texto.trim());
        trocarMeu({ ...meuComentario, ...alterado, tituloCampanha: campanha.titulo });
        setAlterando(false);
        mostrar('Comentário alterado.');
      } else {
        const criado = await comentarioApi.criar(auth.authFetch, campanha.idCampanha, texto.trim());
        trocarMeu({ ...criado, tituloCampanha: campanha.titulo });
        mostrar('Comentário enviado ao autor da campanha.');
      }
      setTexto('');
    } catch (falha: unknown) {
      setErro(traduzirErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  async function apagar(): Promise<void> {
    if (!meuComentario || meuComentario.endossado || enviando) return;
    const confirmou = await pedirConfirmacao({
      titulo: 'Apagar o seu comentário?',
      texto: 'Ele sai do ar. Você pode escrever outro depois.',
      rotuloConfirmar: 'Apagar',
      perigo: true,
    });
    if (!confirmou) return;
    setEnviando(true);
    setErro(null);
    try {
      await comentarioApi.excluir(auth.authFetch, meuComentario.idComentario);
      trocarMeu(null);
      mostrar('Comentário apagado.');
    } catch (falha: unknown) {
      setErro(traduzirErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  const mostrandoFormulario = !carregandoMeus && (!meuComentario || alterando);

  return (
    <section className="space-y-4" aria-labelledby="comentar-campanha-titulo">
      <h3 id="comentar-campanha-titulo" className="subtitulo texto-forte flex items-center gap-2">
        Seu comentário como pesquisador
        <Tooltip baixo texto="Um comentário por campanha. Ele vai para o autor, que pode endossá-lo para aparecer nesta página." />
      </h3>
      {carregandoMeus && <p className="legenda texto-fraco">Carregando…</p>}

      {!carregandoMeus && meuComentario && !alterando && (
        <>
          <div>
            <p className="rotulo mb-2">
              {meuComentario.endossado ? 'Prévia na página da campanha' : 'Comentário (aparece na página quando o autor endossar)'}
            </p>
            <div className={meuComentario.endossado ? undefined : 'opacity-60'}>
              <CartaoEndosso
                nome={auth.usuario?.nome ?? null}
                foto={auth.usuario?.avatarUrl ?? null}
                idPesquisador={auth.usuario?.idUsuario ?? null}
                conteudo={meuComentario.conteudo}
                previa
              />
            </div>
          </div>
          {meuComentario.endossado && (
            <p className="legenda texto-fraco">
              O autor endossou o seu comentário: enquanto estiver endossado, ele não pode ser alterado nem apagado.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => void apagar()} disabled={enviando || meuComentario.endossado}>
              Apagar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={enviando || meuComentario.endossado}
              onClick={() => {
                setTexto(meuComentario.conteudo);
                setAlterando(true);
              }}
            >
              Alterar
            </button>
          </div>
        </>
      )}

      {mostrandoFormulario && (
        <form onSubmit={(evento) => void enviar(evento)} className="space-y-3">
          <label htmlFor="comentario-texto" className="sr-only">
            Comentário
          </label>
          <textarea
            id="comentario-texto"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            rows={4}
            maxLength={limite}
            className="input-padrao w-full"
            aria-describedby="comentario-contador"
          />
          <div className="flex items-center justify-between gap-3">
            <span id="comentario-contador" className="legenda numero texto-fraco">
              {tamanho}/{limite}
            </span>
            <div className="flex gap-2">
              {alterando && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setAlterando(false);
                    setTexto('');
                  }}
                  disabled={enviando}
                >
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={enviando || tamanho === 0 || tamanho > limite}>
                {enviando ? 'Salvando…' : alterando ? 'Salvar' : 'Enviar comentário'}
              </button>
            </div>
          </div>
        </form>
      )}
      {erro && (
        <p className="text-sm texto-erro" role="alert">
          {erro}
        </p>
      )}
    </section>
  );
}
