import { useEffect, useRef, useState } from 'react';
import { Dica } from '../tooltip';
import { BarraAbasBotoes } from '../barra-abas-botoes';
import { logAuditoriaApi } from '../../../services/28-log-auditoria/api/log-auditoria.api';
import { notificacaoInternaApi } from '../../../services/27-notificacao/api/modelo-mensagem.api';
import { useFecharAoClicarFora } from '../../../services/constant/hook/use-fechar-ao-clicar-fora';
import { formatarDataHora } from '../../../services/constant/util/formatacao.util';
import { Carregando } from '../carregando';
import type { UseAuthReturn } from '../../../services/3-auth/hook/use-auth';
import type { LogAuditoriaResponse, OperacaoLogAuditoria } from '../../../services/28-log-auditoria/type/log-auditoria.type';
import type { NotificacaoInternaResponse } from '../../../services/27-notificacao/type/modelo-mensagem.type';

// Parcial de propósito: 'EXPORT' não tem rótulo próprio aqui - o `??
// item.operacao.toLowerCase()` na leitura já cobre esse (e qualquer outro)
// caso ausente, mesmo comportamento de antes.
const ROTULO_OPERACAO: Partial<Record<OperacaoLogAuditoria, string>> = {
  INSERT: 'criou',
  UPDATE: 'alterou',
  DELETE: 'excluiu',
};

type Aba = 'notificacoes' | 'atividade';

interface SinoAtividadeProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
}

// Sino do cabeçalho, com duas abas. Notificações: os avisos do sistema para a própria conta (canal 'interna' de
// notificacao, texto do modelo em Configurações > Mensagens); o número no sino é o de avisos não lidos, e abrir um
// aviso o marca como lido. Minha atividade: as últimas ações da própria conta, lidas de log_auditoria (GET
// /log-auditoria/minha-atividade). As duas são extras: se uma falhar, o sino fica sem ela, sem toast de erro.
export function SinoAtividade({ auth }: SinoAtividadeProps) {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<Aba>('notificacoes');
  const [carregando, setCarregando] = useState(false);
  const [avisos, setAvisos] = useState<NotificacaoInternaResponse[]>([]);
  const [atividade, setAtividade] = useState<LogAuditoriaResponse[] | null>(null);
  const [naoLidas, setNaoLidas] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    notificacaoInternaApi
      .naoLidas(auth.authFetch)
      .then(setNaoLidas)
      .catch(() => {});
  }, [auth.authFetch]);

  useFecharAoClicarFora(containerRef, aberto, () => setAberto(false));

  // Os avisos recarregam a cada abertura (chegam a qualquer momento); a atividade, só na primeira vez que a aba abre.
  const carregar = (qual: Aba) => {
    if (qual === 'atividade' && atividade !== null) return;
    setCarregando(true);
    const pedido =
      qual === 'notificacoes'
        ? notificacaoInternaApi.listar(auth.authFetch).then((lista) => {
            setAvisos(lista);
            setNaoLidas(lista.filter((aviso) => !aviso.lidaEm).length);
          })
        : logAuditoriaApi.minhaAtividade(auth.authFetch).then(setAtividade);
    pedido.catch(() => {}).finally(() => setCarregando(false));
  };

  const aoAbrir = () => {
    const abrindoAgora = !aberto;
    setAberto(abrindoAgora);
    if (abrindoAgora) carregar(aba);
  };

  const aoTrocarAba = (nova: Aba) => {
    setAba(nova);
    carregar(nova);
  };

  const marcarLido = (idNotificacao?: number) => {
    const agora = new Date().toISOString();
    const pedido =
      idNotificacao === undefined
        ? notificacaoInternaApi.marcarTodas(auth.authFetch)
        : notificacaoInternaApi.marcarLida(auth.authFetch, idNotificacao);
    pedido
      .then(() => {
        setAvisos((lista) =>
          lista.map((aviso) =>
            idNotificacao === undefined || aviso.idNotificacao === idNotificacao ? { ...aviso, lidaEm: aviso.lidaEm ?? agora } : aviso,
          ),
        );
        setNaoLidas((total) => (idNotificacao === undefined ? 0 : Math.max(0, total - 1)));
      })
      .catch(() => {});
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={aoAbrir}
        aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : 'Notificações'}
        aria-expanded={aberto}
        className="dica flex items-center justify-center w-9 h-9 borda-padrao border rounded-lg texto-padrao hover-fundo-sutil transition-colors"
      >
        <i className="fa-solid fa-bell" aria-hidden="true"></i>
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full fundo-erro-forte texto-sobre-cor rotulo-leitura texto-herdado flex items-center justify-center">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
        {/* Só com a caixa fechada: aberta, a bolha ficava por trás dela e aparecia no canto de cima. */}
        {!aberto && <Dica texto="Notificações" curta baixo direita />}
      </button>

      {aberto && (
        <div className="absolute -right-12 sm:right-0 mt-2 w-80 fundo-elevado rounded-xl shadow-2xl border borda-forte overflow-hidden z-50">
          <div className="fundo-sutil">
            <BarraAbasBotoes<Aba>
              abas={[
                { chave: 'notificacoes', rotulo: 'Notificações' },
                { chave: 'atividade', rotulo: 'Minha atividade' },
              ]}
              ativa={aba}
              aoTrocar={aoTrocarAba}
              // Meio a meio, texto no centro de cada metade: na caixa estreita, aba do tamanho do texto sobrava à direita.
              className="[&>[role=tab]]:flex-1 [&>[role=tab]]:justify-center"
            />
          </div>

          <div className="max-h-80 overflow-y-auto rolagem-estavel">
            {carregando ? (
              <Carregando className="px-4 py-6 text-center" />
            ) : aba === 'notificacoes' ? (
              avisos.length === 0 ? (
                <p className="paragrafo px-4 py-6 texto-fraco text-center">Nenhuma notificação por enquanto.</p>
              ) : (
                avisos.map((aviso) => (
                  <button
                    key={aviso.idNotificacao}
                    type="button"
                    onClick={() => !aviso.lidaEm && marcarLido(aviso.idNotificacao)}
                    className="w-full text-left px-4 py-3 border-b borda-padrao last:border-b-0 flex gap-3 hover-fundo-sutil"
                  >
                    <span
                      className={'mt-1.5 w-2 h-2 rounded-full shrink-0 ' + (aviso.lidaEm ? '' : 'fundo-marca')}
                      aria-hidden="true"
                    ></span>
                    <span className="min-w-0">
                      <span className="block paragrafo enfase texto-forte">
                        {aviso.titulo}
                        {!aviso.lidaEm && <span className="sr-only"> (não lida)</span>}
                      </span>
                      <span className="block paragrafo texto-padrao mt-0.5">{aviso.mensagem}</span>
                      <span className="block legenda texto-fraco mt-0.5">{formatarDataHora(aviso.criadoEm)}</span>
                    </span>
                  </button>
                ))
              )
            ) : !atividade || atividade.length === 0 ? (
              <p className="paragrafo px-4 py-6 texto-fraco text-center">Nenhuma ação recente sua registrada.</p>
            ) : (
              atividade.map((item) => (
                <div key={item.idLog} className="px-4 py-3 border-b borda-padrao last:border-b-0">
                  <p className="paragrafo texto-forte">
                    Você {ROTULO_OPERACAO[item.operacao] ?? item.operacao.toLowerCase()}{' '}
                    <span className="enfase">{item.tabela}</span> #{item.identidadeRegistro}
                  </p>
                  <p className="legenda texto-fraco mt-0.5">{formatarDataHora(item.ocorridoEm)}</p>
                </div>
              ))
            )}
          </div>

          {aba === 'notificacoes' && naoLidas > 0 && !carregando && (
            <div className="px-4 py-2 border-t borda-padrao fundo-sutil text-right">
              <button type="button" onClick={() => marcarLido()} className="legenda enfase texto-marca hover-texto-forte">
                Marcar todas como lidas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
