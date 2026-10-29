import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Dica } from '../tooltip';
import { logAuditoriaApi } from '../../../services/28-log-auditoria/api/log-auditoria.api';
import { notificacaoInternaApi } from '../../../services/27-notificacao/api/notificacao-interna.api';
import { useFecharAoClicarFora } from '../../../services/constant/hook/use-fechar-ao-clicar-fora';
import { formatarDataHora } from '../../../services/constant/util/formatacao.util';
import { Carregando } from '../carregando';
import type { UseAuthReturn } from '../../../services/3-auth/hook/use-auth';
import type { LogAuditoriaResponse, OperacaoLogAuditoria } from '../../../services/28-log-auditoria/type/log-auditoria.type';
import type { NotificacaoInternaResponse } from '../../../services/27-notificacao/api/notificacao-interna.api';

const CHAVE_ULTIMO_VISTO = 'crowdacademico.atividadeUltimoLogVisto';
const ROTULO_OPERACAO: Partial<Record<OperacaoLogAuditoria, string>> = { INSERT: 'criou', UPDATE: 'alterou', DELETE: 'excluiu' };
type AbaSino = 'notificacoes' | 'atividade';

interface SinoAtividadeProps { auth: Pick<UseAuthReturn, 'authFetch'> }

// O sino combina notificações direcionadas ao usuário (persistidas no banco) com o registro de atividade própria.
// São fontes independentes: a indisponibilidade de uma não impede a outra de funcionar.
export function SinoAtividade({ auth }: SinoAtividadeProps) {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<AbaSino>('notificacoes');
  const [carregando, setCarregando] = useState(false);
  const [itensAtividade, setItensAtividade] = useState<LogAuditoriaResponse[]>([]);
  const [atividadeCarregada, setAtividadeCarregada] = useState(false);
  const [itensNotificacao, setItensNotificacao] = useState<NotificacaoInternaResponse[]>([]);
  const [notificacoesCarregadas, setNotificacoesCarregadas] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [erroNotificacao, setErroNotificacao] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const atualizarResumo = useCallback(() => notificacaoInternaApi.resumo(auth.authFetch)
    .then((resumo) => setNaoLidas(resumo.total_nao_lidas))
    .catch(() => { /* recurso complementar: não bloqueia o cabeçalho */ }), [auth.authFetch]);

  useEffect(() => {
    void atualizarResumo();
  }, [auth.authFetch, atualizarResumo]);

  useFecharAoClicarFora(containerRef, aberto, () => setAberto(false));

  const carregarNotificacoes = async () => {
    setCarregando(true);
    setErroNotificacao(false);
    try {
      setItensNotificacao(await notificacaoInternaApi.listar(auth.authFetch, 20, false));
      setNotificacoesCarregadas(true);
      await atualizarResumo();
    } catch {
      setErroNotificacao(true);
    } finally { setCarregando(false); }
  };

  const carregarAtividade = async () => {
    setCarregando(true);
    try {
      const lista = await logAuditoriaApi.minhaAtividade(auth.authFetch);
      setItensAtividade(lista);
      setAtividadeCarregada(true);
      if (lista.length > 0) localStorage.setItem(CHAVE_ULTIMO_VISTO, String(lista[0].idLog));
    } catch { setItensAtividade([]); }
    finally { setCarregando(false); }
  };

  const alternarAba = (novaAba: AbaSino) => {
    setAba(novaAba);
    if (novaAba === 'notificacoes' && !notificacoesCarregadas) void carregarNotificacoes();
    if (novaAba === 'atividade' && !atividadeCarregada) void carregarAtividade();
  };

  const abrirSino = () => {
    const abrindo = !aberto;
    setAberto(abrindo);
    if (abrindo) {
      setAba('notificacoes');
      if (!notificacoesCarregadas) void carregarNotificacoes();
    }
  };

  const marcarLida = async (item: NotificacaoInternaResponse) => {
    if (!item.lida_em) {
      try {
        await notificacaoInternaApi.marcarLida(auth.authFetch, item.id_notificacao_interna);
        setItensNotificacao((atual) => atual.map((n) => n.id_notificacao_interna === item.id_notificacao_interna ? { ...n, lida_em: new Date().toISOString() } : n));
        setNaoLidas((atual) => Math.max(0, atual - 1));
      } catch { return; }
    }
    const destino = item.url_destino;
    setAberto(false);
    // Só navega para caminhos relativos do próprio app; não aceita URL externa vinda do banco.
    if (destino?.startsWith('/') && !destino.startsWith('//')) navigate(destino);
  };

  const marcarTodas = async () => {
    try {
      await notificacaoInternaApi.marcarTodasLidas(auth.authFetch);
      setItensNotificacao((atual) => atual.map((n) => ({ ...n, lida_em: n.lida_em ?? new Date().toISOString() })));
      setNaoLidas(0);
    } catch { setErroNotificacao(true); }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={abrirSino} aria-label="Notificações e atividade" aria-expanded={aberto}
        className="dica relative flex items-center justify-center w-9 h-9 borda-padrao border rounded-lg texto-padrao hover-fundo-sutil transition-colors">
        <i className="fa-solid fa-bell" aria-hidden="true"></i>
        {naoLidas > 0 && <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full fundo-erro-forte texto-sobre-cor rotulo-leitura texto-herdado flex items-center justify-center">{naoLidas > 99 ? '99+' : naoLidas}</span>}
        <Dica texto="Notificações" curta baixo direita />
      </button>

      {aberto && <section className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] fundo-elevado rounded-xl shadow-2xl border borda-forte overflow-hidden z-50" aria-label="Central de notificações">
        <div className="px-4 pt-3 border-b borda-padrao fundo-sutil">
          <div className="flex items-center justify-between gap-2"><p className="paragrafo-destaque texto-forte">Central de atividades</p>{aba === 'notificacoes' && naoLidas > 0 && <button className="legenda hover-texto-marca" type="button" onClick={() => void marcarTodas()}>Marcar todas como lidas</button>}</div>
          <div className="flex gap-4 mt-3" role="tablist" aria-label="Tipo de atividade">
            <button type="button" role="tab" aria-selected={aba === 'notificacoes'} onClick={() => alternarAba('notificacoes')} className={'pb-2 paragrafo ' + (aba === 'notificacoes' ? 'border-b-2 borda-marca texto-forte' : 'texto-fraco')}>Notificações {naoLidas > 0 ? `(${naoLidas})` : ''}</button>
            <button type="button" role="tab" aria-selected={aba === 'atividade'} onClick={() => alternarAba('atividade')} className={'pb-2 paragrafo ' + (aba === 'atividade' ? 'border-b-2 borda-marca texto-forte' : 'texto-fraco')}>Minha atividade</button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto" role="tabpanel">
          {carregando ? <Carregando className="px-4 py-6 text-center" /> : aba === 'notificacoes' ? (
            erroNotificacao ? <div className="px-4 py-6 text-center"><p className="paragrafo texto-fraco">Não foi possível carregar as notificações.</p><button type="button" className="btn btn-secundario mt-3" onClick={() => void carregarNotificacoes()}>Tentar novamente</button></div> : itensNotificacao.length === 0 ? <p className="paragrafo px-4 py-6 texto-fraco text-center">Você não tem notificações por enquanto.</p> : itensNotificacao.map((item) => <button type="button" key={item.id_notificacao_interna} onClick={() => void marcarLida(item)} className={'w-full text-left px-4 py-3 border-b borda-padrao last:border-b-0 hover-fundo-sutil ' + (!item.lida_em ? 'fundo-sutil' : '')}>
              <div className="flex items-start gap-2"><span className={'mt-1 w-2 h-2 rounded-full shrink-0 ' + (!item.lida_em ? 'fundo-marca' : 'border borda-padrao')} aria-label={!item.lida_em ? 'Não lida' : 'Lida'} /><span className="min-w-0 flex-1"><span className="block paragrafo-destaque texto-forte">{item.titulo}</span><span className="block paragrafo texto-padrao mt-1 whitespace-normal">{item.mensagem}</span><span className="block legenda texto-fraco mt-1">{formatarDataHora(item.criado_em)}</span></span></div>
            </button>)
          ) : itensAtividade.length === 0 ? <p className="paragrafo px-4 py-6 texto-fraco text-center">Nenhuma ação recente sua registrada.</p> : itensAtividade.map((item) => <div key={item.idLog} className="px-4 py-3 border-b borda-padrao last:border-b-0"><p className="paragrafo texto-forte">Você {ROTULO_OPERACAO[item.operacao] ?? item.operacao.toLowerCase()} <span className="enfase">{item.tabela}</span> #{item.identidadeRegistro}</p><p className="legenda texto-fraco mt-0.5">{formatarDataHora(item.ocorridoEm)}</p></div>)}
        </div>
      </section>}
    </div>
  );
}
