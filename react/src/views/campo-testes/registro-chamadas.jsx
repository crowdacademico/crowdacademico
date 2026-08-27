// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useState } from 'react';
import { API_BASE_URL } from '../../services/constant/constants/api.constants';
import { useCampoTestes } from '../../services/campo-testes/hook/use-campo-testes';

// Prévia de uma linha só, pra comparar retornos direto na lista, sem
// clicar em cada linha (23-08-2026, pedido do Lucas: ERA um painel à
// parte, "Mesmo GET, dois pontos de vista", comparando o CPF visto por
// dois atores; virou isto aqui, dois GETs de atores diferentes já
// aparecem como duas linhas, cada uma com seu retorno visível).
function formatarPrevia(corpo) {
  if (corpo === null || corpo === undefined) return '(sem corpo)';
  const texto = JSON.stringify(corpo);
  return texto.length > 120 ? `${texto.slice(0, 120)}...` : texto;
}

const TAMANHOS_PAGINA = [10, 20, 30, 'todos'];

function montarCurl(chamada) {
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

// T4, gaveta recolhível, presente em toda tela do Campo de Testes.
// Substituto direto do Thunder Client: toda chamada feita via
// useChamadaRegistrada (qualquer tela) aparece aqui, mais recente
// primeiro. SEM coluna "Ator" (25-08-2026, remoção do Elenco): só existe
// um "ator" possível agora, a sessão real logada — mostrar seria ruído.
export function RegistroChamadas() {
  const { registroChamadas, limparRegistro } = useCampoTestes();
  const [aberto, setAberto] = useState(false);
  const [linhaExpandida, setLinhaExpandida] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(10);

  const totalPaginas = tamanhoPagina === 'todos' ? 1 : Math.max(1, Math.ceil(registroChamadas.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const registrosPagina =
    tamanhoPagina === 'todos'
      ? registroChamadas
      : registroChamadas.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina);

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
                <span title={formatarPrevia(chamada.corpoRecebido)}>{formatarPrevia(chamada.corpoRecebido)}</span>
              </div>

              {linhaExpandida === chamada.id && (
                <div className="fundo-sutil rounded-md p-3 my-1 text-xs">
                  <p className="font-bold mb-1">Enviado</p>
                  <pre className="overflow-x-auto">{JSON.stringify(chamada.corpoEnviado, null, 2) ?? '(sem corpo)'}</pre>
                  <p className="font-bold mt-2 mb-1">Recebido</p>
                  <pre className="overflow-x-auto">{JSON.stringify(chamada.corpoRecebido, null, 2) ?? '(sem corpo)'}</pre>
                  <button
                    type="button"
                    className="btn btn-secondary text-xs mt-2"
                    onClick={() => navigator.clipboard?.writeText(montarCurl(chamada))}
                  >
                    <i className="fa-solid fa-copy"></i> Copiar como cURL
                  </button>
                </div>
              )}
            </div>
          ))}

          {registroChamadas.length > TAMANHOS_PAGINA[0] && (
            <div className="flex items-center justify-between flex-wrap gap-3 mt-3 text-sm texto-padrao">
              <span>
                Página {paginaAtual} de {totalPaginas} ({registroChamadas.length} registros)
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold texto-padrao">
                  Mostrar
                  <select
                    value={tamanhoPagina}
                    onChange={(evento) => {
                      const valor = evento.target.value;
                      setTamanhoPagina(valor === 'todos' ? 'todos' : Number(valor));
                      setPagina(1);
                    }}
                    className="border borda-padrao rounded-md fundo-sutil py-1 px-2 text-xs outline-none focus:border-primary"
                  >
                    {TAMANHOS_PAGINA.map((tamanho) => (
                      <option key={tamanho} value={tamanho}>
                        {tamanho === 'todos' ? 'Todos' : tamanho}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                    disabled={paginaAtual === 1}
                    className="btn btn-secondary"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
                    disabled={paginaAtual === totalPaginas}
                    className="btn btn-secondary"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
