// Campo de Testes é parte permanente do painel administrativo (não uma ferramenta de teste descartável), com o
// mesmo padrão de dados/comportamento do resto do sistema (nunca uma versão simplificada à parte).

import { useState } from 'react';
import { API_BASE_URL } from '../../services/constant/constants/api.constants';
import { paginarClientSide } from '../../services/constant/utils/paginacao.util';
import { RodapePaginacao } from '../../components/pagination/rodape-paginacao';
import { useCampoTestes } from '../../services/campo-testes/hook/use-campo-testes';
import type { RegistroChamada } from '../../services/campo-testes/context/campo-testes-context';

// Prévia de uma linha só, para comparar retornos direto na lista, sem clicar em cada linha: dois GETs aparecem
// como duas linhas, cada uma com seu retorno visível.
function formatarPrevia(corpo: unknown): string {
  if (corpo === null || corpo === undefined) return '(sem corpo)';
  const texto = JSON.stringify(corpo);
  return texto.length > 120 ? `${texto.slice(0, 120)}...` : texto;
}

function montarCurl(chamada: RegistroChamada): string {
  const partes = [`curl -X ${chamada.metodo} '${API_BASE_URL}${chamada.caminho}'`, `-H 'Content-Type: application/json'`];
  if (chamada.corpoEnviado) {
    partes.push(`-d '${JSON.stringify(chamada.corpoEnviado)}'`);
  }
  // Sem o Bearer de propósito: o token do ator não fica gravado no
  // Registro de Chamadas (só o corpo, método, caminho e resultado), então
  // não tem como reconstruir o cURL 100% autenticado a partir daqui. É
  // uma limitação consciente, não um esquecimento: gravar token de sessão
  // num log que fica na tela o tempo todo seria pior que não ter o cURL
  // pronto.
  return partes.join(' \\\n  ');
}

// T4, gaveta recolhível, presente em toda tela do Campo de Testes. Substituto direto do Thunder Client: toda
// chamada feita via useChamadaRegistrada (qualquer tela) aparece aqui, mais recente primeiro. Sem coluna
// "Ator": só existe um "ator" possível, a sessão real logada.
export function RegistroChamadas() {
  const { registroChamadas, limparRegistro } = useCampoTestes();
  const [aberto, setAberto] = useState(false);
  const [linhaExpandida, setLinhaExpandida] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<number | 'todos'>(10);

  const { totalPaginas, paginaAtual, itensPagina: registrosPagina } = paginarClientSide(registroChamadas, pagina, tamanhoPagina);

  return (
    <div className="registro-chamadas">
      <button type="button" className="btn btn-secondary text-xs" onClick={() => setAberto((atual) => !atual)}>
        <i className={`fa-solid fa-chevron-${aberto ? 'down' : 'right'}`}></i> T4 - Registro de Chamadas (
        {registroChamadas.length})
      </button>

      {aberto && (
        <div className="mt-2">
          {registroChamadas.length === 0 && (
            <p className="texto-fraco text-xs">Nenhuma chamada registrada ainda nesta aba.</p>
          )}

          {registroChamadas.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary text-xs mb-2"
              onClick={() => {
                limparRegistro();
                setPagina(1);
              }}
            >
              Limpar registro
            </button>
          )}

          {registroChamadas.length > 0 && (
            <div className="registro-chamadas__linha registro-chamadas__linha--cabecalho">
              <span>Hora</span>
              <span>Chamada</span>
              <span>Status</span>
              <span>ms</span>
              <span>Recebido</span>
            </div>
          )}

          {registrosPagina.map((chamada) => (
            <div key={chamada.id}>
              <div
                className={'registro-chamadas__linha' + (chamada.ok ? '' : ' registro-chamadas__linha--erro')}
                onClick={() => setLinhaExpandida((atual) => (atual === chamada.id ? null : chamada.id))}
              >
                <span>{chamada.hora.toLocaleTimeString('pt-BR')}</span>
                <span>
                  {chamada.metodo} {chamada.caminho}
                </span>
                <span>{chamada.status}</span>
                <span>{chamada.ms}ms</span>
                <span>{formatarPrevia(chamada.corpoRecebido)}</span>
              </div>

              {linhaExpandida === chamada.id && (
                <div className="fundo-sutil rounded-md p-3 my-1 text-xs">
                  <p className="font-bold mb-1">Enviado</p>
                  <pre className="overflow-x-auto">{JSON.stringify(chamada.corpoEnviado, null, 2)}</pre>
                  <p className="font-bold mt-2 mb-1">Recebido</p>
                  <pre className="overflow-x-auto">{JSON.stringify(chamada.corpoRecebido, null, 2)}</pre>
                  <button
                    type="button"
                    className="btn btn-secondary text-xs mt-2"
                    onClick={() => {
                      // `navigator.clipboard` (`no-unnecessary-condition`): o tipo do lib.dom.d.ts afirma
                      // sempre presente, mas a Clipboard API de verdade só existe em contexto seguro
                      // (HTTPS/localhost) e falta em navegador mais antigo: proteção real contra o ambiente,
                      // não código morto.
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                      void navigator.clipboard?.writeText(montarCurl(chamada));
                    }}
                  >
                    <i className="fa-solid fa-copy"></i> Copiar como cURL
                  </button>
                </div>
              )}
            </div>
          ))}

          <RodapePaginacao
            total={registroChamadas.length}
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            tamanhoPagina={tamanhoPagina}
            aoMudarPagina={setPagina}
            aoMudarTamanho={(tamanho) => {
              setTamanhoPagina(tamanho);
              setPagina(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
