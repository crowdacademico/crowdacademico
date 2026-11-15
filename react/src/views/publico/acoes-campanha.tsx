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

      <div className="border-t borda-padrao pt-5">
        <h2 className="rotulo mb-3">Compartilhar</h2>
        <div className="flex flex-wrap gap-2">
          {podeCompartilharNativo && (
            <button type="button" onClick={() => void compartilharNativo()} className="btn btn-secondary text-sm">
              <i className="fa-solid fa-share-nodes" aria-hidden="true" /> Compartilhar
            </button>
          )}
          {redes.map((rede) => (
            <a
              key={rede.rotulo}
              href={rede.href}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-secondary text-sm"
              aria-label={`Compartilhar no ${rede.rotulo} (abre em nova aba)`}
            >
              <i className={rede.icone} aria-hidden="true" /> {rede.rotulo}
            </a>
          ))}
          <button type="button" onClick={() => void copiarLink()} className="btn btn-secondary text-sm">
            <i className="fa-solid fa-link" aria-hidden="true" /> Copiar link
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

// RF-096: pesquisador comenta campanha de OUTRO pesquisador, um comentário por campanha, com limite configurável.
// O comentário vai para o dono da campanha; aparece aqui na página só se o dono endossar. As regras finais (perfil
// ativo, campanha aceita comentário, um por campanha) são do banco: este formulário só evita o envio óbvio errado.
export function FormComentarCampanha({ auth, campanha }: AcoesCampanhaProps) {
  const { mostrar } = useToast();
  const limite = useConfiguracoes().obterNumero('limite_caracteres_comentario', 500);
  const [meus, setMeus] = useState<{ chave: string; lista: ComentarioMeuResponse[] } | null>(null);
  const [texto, setTexto] = useState('');
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
      <p className="legenda mt-6 texto-fraco">
        Pesquisadores podem comentar campanhas de outros pesquisadores. O comentário aparece aqui quando o autor da
        campanha o endossa.
      </p>
    );
  }

  const meuComentario = meus?.chave === chave ? meus.lista.find((item) => item.idCampanha === campanha.idCampanha) : undefined;
  const carregandoMeus = meus?.chave !== chave;
  const tamanho = texto.trim().length;

  async function enviar(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    if (enviando || tamanho === 0 || tamanho > limite) return;
    setEnviando(true);
    setErro(null);
    try {
      const criado = await comentarioApi.criar(auth.authFetch, campanha.idCampanha, texto.trim());
      setMeus({
        chave,
        lista: [
          ...(meus?.lista ?? []),
          { ...criado, tituloCampanha: campanha.titulo },
        ],
      });
      setTexto('');
      mostrar('Comentário enviado ao autor da campanha.');
    } catch (falha: unknown) {
      setErro(traduzirErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-8 border-t borda-padrao pt-6" aria-labelledby="comentar-campanha-titulo">
      <h3 id="comentar-campanha-titulo" className="subtitulo texto-forte mb-2">
        Seu comentário como pesquisador
      </h3>
      {carregandoMeus && <p className="legenda texto-fraco">Carregando…</p>}
      {!carregandoMeus && meuComentario && (
        <div className="rounded-lg fundo-sutil border borda-padrao p-4">
          <p className="legenda mb-2 texto-fraco">
            {meuComentario.endossado
              ? 'O autor endossou o seu comentário: ele aparece na lista acima.'
              : 'Enviado ao autor da campanha. Aparece nesta página se ele endossar.'}
          </p>
          <p className="paragrafo texto-padrao whitespace-pre-wrap">{meuComentario.conteudo}</p>
        </div>
      )}
      {!carregandoMeus && !meuComentario && (
        <form onSubmit={(evento) => void enviar(evento)} className="space-y-3">
          <p className="legenda texto-fraco">
            Um comentário por campanha. Ele vai para o autor, que pode endossá-lo para aparecer nesta página.
          </p>
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
            <button type="submit" className="btn btn-primary" disabled={enviando || tamanho === 0 || tamanho > limite}>
              {enviando ? 'Enviando…' : 'Enviar comentário'}
            </button>
          </div>
          {erro && (
            <p className="text-sm texto-erro" role="alert">
              {erro}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
