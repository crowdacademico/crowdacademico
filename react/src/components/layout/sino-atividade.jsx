import { useEffect, useRef, useState } from 'react';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';

const CHAVE_ULTIMO_VISTO = 'crowdacademico.atividadeUltimoLogVisto';

const ROTULO_OPERACAO = {
  INSERT: 'criou',
  UPDATE: 'alterou',
  DELETE: 'excluiu',
};

// Sino "Atividade recente" no cabeçalho (09-08-2026, Bloco B/C do prompt do
// Claude Web) - ideia melhor que a original (cachear toast no client): lê
// log_auditoria de verdade, filtrado pro PRÓPRIO usuário
// (GET /log-auditoria/minha-atividade, RLS ampliada em pol_log_auditoria_
// select pra isso). Sobrevive a F5 e a trocar de dispositivo; toast é
// feedback de "o que EU acabei de clicar", isso aqui é "o que aconteceu,
// mesmo enquanto eu não estava olhando".
//
// Rotulado "Atividade recente", não "Notificações" - quando 26-notificacao
// existir de verdade, o dropdown ganha uma 2ª aba ("Notificações") e esta
// vira "Minha atividade", nada do que existe hoje é jogado fora.
export function SinoAtividade({ auth }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [itens, setItens] = useState([]);
  const [naoLidos, setNaoLidos] = useState(0);
  const containerRef = useRef(null);

  // Badge de contagem SEM coluna "lida" no banco (09-08-2026, pedido
  // explícito do Claude Web nessa análise) - guarda só o maior id_log já
  // visto em localStorage, conta quantas entradas novas passaram disso.
  useEffect(() => {
    logAuditoriaApi
      .minhaAtividade(auth.authFetch)
      .then((lista) => {
        const ultimoVisto = Number(localStorage.getItem(CHAVE_ULTIMO_VISTO)) || 0;
        setNaoLidos(lista.filter((item) => item.idLog > ultimoVisto).length);
      })
      .catch(() => {
        // Sino é um extra, não uma tela crítica - se falhar (ex.: usuário
        // sem log_visualizar E policy nova ainda não aplicada no banco),
        // só fica sem badge, sem toast de erro atrapalhando o resto.
      });
  }, [auth.authFetch]);

  useEffect(() => {
    if (!aberto) {
      return undefined;
    }
    const aoClicarFora = (evento) => {
      if (containerRef.current && !containerRef.current.contains(evento.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  const aoAbrir = () => {
    const abrindoAgora = !aberto;
    setAberto(abrindoAgora);
    if (abrindoAgora && !carregado) {
      setCarregando(true);
      logAuditoriaApi
        .minhaAtividade(auth.authFetch)
        .then((lista) => {
          setItens(lista);
          setCarregado(true);
          if (lista.length > 0) {
            localStorage.setItem(CHAVE_ULTIMO_VISTO, String(lista[0].idLog));
          }
          setNaoLidos(0);
        })
        .catch(() => setItens([]))
        .finally(() => setCarregando(false));
    } else if (abrindoAgora) {
      setNaoLidos(0);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={aoAbrir}
        aria-label="Atividade recente"
        title="Atividade recente"
        className="relative flex items-center justify-center w-9 h-9 borda-padrao border rounded-lg texto-padrao hover-fundo-sutil transition-colors"
      >
        <i className="fa-solid fa-bell"></i>
        {naoLidos > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {naoLidos > 9 ? '9+' : naoLidos}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-80 fundo-elevado rounded-xl shadow-2xl border borda-forte overflow-hidden z-50">
          <div className="px-4 py-3 border-b borda-padrao fundo-sutil">
            <p className="text-sm font-bold texto-forte">Atividade recente</p>
            <p className="text-xs texto-fraco">Últimas ações feitas por você</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {carregando ? (
              <p className="px-4 py-6 text-sm texto-fraco text-center">Carregando...</p>
            ) : itens.length === 0 ? (
              <p className="px-4 py-6 text-sm texto-fraco text-center">
                Nenhuma ação recente sua registrada.
              </p>
            ) : (
              itens.map((item) => (
                <div key={item.idLog} className="px-4 py-3 border-b borda-padrao last:border-b-0">
                  <p className="text-sm texto-forte">
                    Você {ROTULO_OPERACAO[item.operacao] ?? item.operacao.toLowerCase()}{' '}
                    <span className="font-semibold">{item.tabela}</span> #
                    {item.identidadeRegistro}
                  </p>
                  <p className="text-xs texto-fraco mt-0.5">
                    {new Date(item.ocorridoEm).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
