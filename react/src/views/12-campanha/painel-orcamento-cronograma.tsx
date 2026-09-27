import { useCallback, useEffect, useRef, useState } from 'react';
import { AcaoLinha } from '../../components/crud/acao-linha';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { orcamentoCampanhaApi } from '../../services/13-orcamento-campanha/api/orcamento-campanha.api';
import { marcoCronogramaApi } from '../../services/14-marco-cronograma/api/marco-cronograma.api';
import { formatarMoeda } from '../../services/constant/utils/formatacao.util';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { OrcamentoCampanhaResponse } from '../../services/13-orcamento-campanha/type/orcamento-campanha.type';
import type { MarcoCronogramaResponse } from '../../services/14-marco-cronograma/type/marco-cronograma.type';

// Orçamento e cronograma de UMA campanha: lista, adiciona, altera e exclui itens. Usado por Minhas Campanhas
// (o pesquisador) e pelo Campo de Testes (T2), que passa um `authFetch` que também registra as chamadas no T4.
// Quem barra item inválido é o banco (valor, data de marco antes do início, limite de itens, campanha já
// congelada): o erro aparece na tela, nunca some calado.

interface PainelOrcamentoCronogramaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  podeEditar: boolean;
  // `aoCarregar`: callback opcional que devolve os dados toda vez que este painel (re)carrega, para quem usa (o
  // modal de Alterar) manter as CONTAGENS em dia sem duplicar adicionar/remover. Só o Alterar passa isto, o
  // Consultar não precisa.
  aoCarregar?: (orcamento: OrcamentoCampanhaResponse[], cronograma: MarcoCronogramaResponse[]) => void;
  // `abaFixa`: quando presente, trava a aba nesse valor e esconde os 2 botões de trocar aba (Orçamento e
  // Cronograma são 2 etapas/modais diferentes dentro de Criar Campanha; não faz sentido oferecer "trocar para
  // Cronograma" dentro da etapa que É a de Orçamento). Alterar/Consultar Campanha não passam isto e mantêm as 2
  // abas.
  abaFixa?: 'orcamento' | 'cronograma';
  // `metaFinanceira`: opcional; quando presente, mostra "Soma X de Y" logo acima da tabela de Orçamento, com a
  // diferença em destaque. O banco já EXIGE essa igualdade exata na aprovação (fn_valida_completude_campanha,
  // RF-039/040); isto só adianta o feedback, como os avisos de prazo/meta mínima no formulário de Dados.
  metaFinanceira?: number;
  // `dataInicioCampanha`: `min` do campo "Data prevista" de um marco novo. SÓ o mínimo, de propósito:
  // RF-042/`fn_valida_data_marco_cronograma` (05_regras_negocio.sql) bloqueiam data ANTERIOR ao início, mas
  // permitem ultrapassar `data_fim` (um marco de divulgação de resultado costuma acontecer depois do prazo de
  // arrecadação). Não existir `max` aqui não é um bug, é a regra de negócio.
  dataInicioCampanha?: string;
  // `minimoMarcosCronograma`: quando vem junto com `metaFinanceira`, mostra 2 tabelinhas simples (Meta/Soma
  // atual em Orçamento; Mínimo de marcos/Marcos cadastrados em Cronograma, cada uma dentro da própria aba): só
  // um par rótulo + textbox readonly com o valor já declarado, com borda vermelha quando não bate/não atinge o
  // mínimo (não é o checklist "Pronta para aprovar?" de Alterar Campanha).
  minimoMarcosCronograma?: number;
}

// Painel de Orçamento/Cronograma: mesmo padrão de <PainelLinksAcademicos> em T1: componente próprio com estado
// próprio, porque Consultar/Alterar abrem campanhas diferentes. O checklist "Pronta para aprovar?" do modal de
// Alterar recebe as contagens por `aoCarregar`, sem duplicar adicionar/remover.
export function PainelOrcamentoCronograma({
  auth,
  idCampanha,
  podeEditar,
  aoCarregar,
  abaFixa,
  metaFinanceira,
  dataInicioCampanha,
  minimoMarcosCronograma,
}: PainelOrcamentoCronogramaProps) {
  const { reportarErro } = useErroToast();
  const [orcamento, setOrcamento] = useState<OrcamentoCampanhaResponse[]>([]);
  const [cronograma, setCronograma] = useState<MarcoCronogramaResponse[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'orcamento' | 'cronograma'>(abaFixa ?? 'orcamento');
  const [novoItemOrcamento, setNovoItemOrcamento] = useState({ categoria: '', valor: '' });
  const [novoMarco, setNovoMarco] = useState({ titulo: '', dataPrevista: '' });
  // Alterar/Consultar de item de orçamento e marco: mesmo padrão de edição em linha de Link Acadêmico em
  // modal-usuario.tsx (linha vira input + Salvar/Cancelar; fora de edição, vira Alterar/Consultar/Excluir).
  // Consultar é `ModalDetalhe` (mesmo componente, mesmo `rotuloAcao="Consultar"` que Link Acadêmico usa): não
  // tem nada escondido para mostrar que a própria linha já não mostre, mas mantém os 3 ícones por consistência
  // com o resto do painel.
  const [idOrcamentoEditando, setIdOrcamentoEditando] = useState<number | null>(null);
  const [formEdicaoOrcamento, setFormEdicaoOrcamento] = useState({ categoria: '', valor: '' });
  const [itemOrcamentoConsultado, setItemOrcamentoConsultado] = useState<OrcamentoCampanhaResponse | null>(null);
  const [idMarcoEditando, setIdMarcoEditando] = useState<number | null>(null);
  const [formEdicaoMarco, setFormEdicaoMarco] = useState({ titulo: '', dataPrevista: '' });
  const [marcoConsultado, setMarcoConsultado] = useState<MarcoCronogramaResponse | null>(null);

  // Ref (não dependência de `carregar`): `aoCarregar` recebe uma arrow function nova a cada render do modal
  // pai; colocá-la nas dependências de `useCallback` recriaria `carregar` toda hora, disparando o efeito de
  // baixo em loop. O ref sempre lê a versão mais recente sem esse risco. Atualizado em `useEffect` (não direto
  // no corpo do componente): mutar ref durante o render é proibido pela regra `react-hooks/refs`.
  const aoCarregarRef = useRef(aoCarregar);
  useEffect(() => {
    aoCarregarRef.current = aoCarregar;
  });

  const carregar = useCallback(() => {
    Promise.all([
      orcamentoCampanhaApi.listar(auth.authFetch, idCampanha).catch(() => []),
      marcoCronogramaApi.listar(auth.authFetch, idCampanha).catch(() => []),
    ])
      .then(([dadosOrcamento, dadosCronograma]) => {
        setOrcamento(dadosOrcamento);
        setCronograma(dadosCronograma);
        aoCarregarRef.current?.(dadosOrcamento, dadosCronograma);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCampanha]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const adicionarItemOrcamento = async () => {
    if (!novoItemOrcamento.categoria || !novoItemOrcamento.valor) return;
    try {
      await orcamentoCampanhaApi.criar(auth.authFetch, {
        idCampanha,
        categoria: novoItemOrcamento.categoria,
        valor: Number(novoItemOrcamento.valor),
      });
      setNovoItemOrcamento({ categoria: '', valor: '' });
      carregar();
    } catch (erro) {
      reportarErro(erro);
    }
  };

  const removerItemOrcamento = async (idOrcamento: number) => {
    try {
      await orcamentoCampanhaApi.remover(auth.authFetch, idOrcamento);
      carregar();
    } catch (erro) {
      reportarErro(erro);
    }
  };

  const iniciarEdicaoOrcamento = (item: OrcamentoCampanhaResponse) => {
    setIdOrcamentoEditando(item.idOrcamento);
    setFormEdicaoOrcamento({ categoria: item.categoria, valor: String(item.valor) });
  };

  const salvarEdicaoOrcamento = async () => {
    if (!formEdicaoOrcamento.categoria || !formEdicaoOrcamento.valor || idOrcamentoEditando === null) return;
    try {
      await orcamentoCampanhaApi.atualizar(auth.authFetch, idOrcamentoEditando, {
        categoria: formEdicaoOrcamento.categoria,
        valor: Number(formEdicaoOrcamento.valor),
      });
      setIdOrcamentoEditando(null);
      carregar();
    } catch (erro) {
      reportarErro(erro);
    }
  };

  const adicionarMarco = async () => {
    if (!novoMarco.titulo || !novoMarco.dataPrevista) return;
    try {
      await marcoCronogramaApi.criar(auth.authFetch, {
        idCampanha,
        titulo: novoMarco.titulo,
        dataPrevista: new Date(novoMarco.dataPrevista).toISOString(),
      });
      setNovoMarco({ titulo: '', dataPrevista: '' });
      carregar();
    } catch (erro) {
      reportarErro(erro);
    }
  };

  const removerMarco = async (idMarco: number) => {
    try {
      await marcoCronogramaApi.remover(auth.authFetch, idMarco);
      carregar();
    } catch (erro) {
      reportarErro(erro);
    }
  };

  const iniciarEdicaoMarco = (marco: MarcoCronogramaResponse) => {
    setIdMarcoEditando(marco.idMarco);
    setFormEdicaoMarco({ titulo: marco.titulo, dataPrevista: marco.dataPrevista.slice(0, 10) });
  };

  const salvarEdicaoMarco = async () => {
    if (!formEdicaoMarco.titulo || !formEdicaoMarco.dataPrevista || idMarcoEditando === null) return;
    try {
      await marcoCronogramaApi.atualizar(auth.authFetch, idMarcoEditando, {
        titulo: formEdicaoMarco.titulo,
        dataPrevista: new Date(formEdicaoMarco.dataPrevista).toISOString(),
      });
      setIdMarcoEditando(null);
      carregar();
    } catch (erro) {
      reportarErro(erro);
    }
  };

  return (
    <div>
      {!abaFixa && (
        <div className="flex gap-2 mb-3">
          <button type="button" className={`btn ${abaAtiva === 'orcamento' ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => setAbaAtiva('orcamento')}>
            Orçamento
          </button>
          <button type="button" className={`btn ${abaAtiva === 'cronograma' ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => setAbaAtiva('cronograma')}>
            Cronograma
          </button>
        </div>
      )}

      {abaAtiva === 'orcamento' && (
        <>
          {/* Meta/Soma em estilo tabela simples, 2 textbox readonly: rótulo + valor comparável lado a lado,
              sem badge/palavra "aprovar" (isto é criação, não aprovação). `.borda-erro` (mesmo par usado no
              resto do painel) marca a Soma quando ela não bate com a Meta, sem precisar de um badge ao lado
              dizendo a mesma coisa 2x. */}
          {metaFinanceira !== undefined && (() => {
            const somaOrcamento = orcamento.reduce((soma, item) => soma + item.valor, 0);
            const bate = somaOrcamento === metaFinanceira;
            return (
              <table className="crud-tabela mb-3">
                <tbody>
                  <tr>
                    <td>Meta</td>
                    <td><input type="text" readOnly value={formatarMoeda(metaFinanceira)} className="input-padrao" /></td>
                  </tr>
                  <tr>
                    <td>Soma atual</td>
                    <td><input type="text" readOnly value={formatarMoeda(somaOrcamento)} className={'input-padrao' + (bate ? '' : ' borda-erro')} /></td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
          <div className="crud-tabela__wrapper">
            <table className="crud-tabela mb-3">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Valor</th>
                {podeEditar && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {orcamento.map((item) => {
                const emEdicao = idOrcamentoEditando === item.idOrcamento;
                return (
                  <tr key={item.idOrcamento}>
                    {emEdicao ? (
                      <>
                        <td>
                          <input
                            type="text"
                            value={formEdicaoOrcamento.categoria}
                            onChange={(e) => setFormEdicaoOrcamento({ ...formEdicaoOrcamento, categoria: e.target.value })}
                            className="input-padrao"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={formEdicaoOrcamento.valor}
                            onChange={(e) => setFormEdicaoOrcamento({ ...formEdicaoOrcamento, valor: e.target.value })}
                            className="input-padrao"
                          />
                        </td>
                        {podeEditar && (
                          <td>
                            <div className="crud-tabela__acoes">
                              <AcaoLinha rotulo="Salvar" icone="fa-check" variante="alterar" onClick={salvarEdicaoOrcamento} />
                              <AcaoLinha rotulo="Cancelar" icone="fa-xmark" onClick={() => setIdOrcamentoEditando(null)} />
                            </div>
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        <td>{item.categoria}</td>
                        <td>{formatarMoeda(item.valor)}</td>
                        {podeEditar && (
                          <td>
                            <div className="crud-tabela__acoes">
                              <AcaoLinha rotulo="Alterar" icone="fa-pen" variante="alterar" onClick={() => iniciarEdicaoOrcamento(item)} />
                              <AcaoLinha rotulo="Consultar" icone="fa-eye" onClick={() => setItemOrcamentoConsultado(item)} />
                              <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => removerItemOrcamento(item.idOrcamento)} />
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
              {podeEditar && (
                <tr>
                  <td>
                    <input type="text" value={novoItemOrcamento.categoria} onChange={(e) => setNovoItemOrcamento({ ...novoItemOrcamento, categoria: e.target.value })} className="input-padrao" placeholder="Categoria" />
                  </td>
                  <td>
                    <input type="number" value={novoItemOrcamento.valor} onChange={(e) => setNovoItemOrcamento({ ...novoItemOrcamento, valor: e.target.value })} className="input-padrao" placeholder="Valor" />
                  </td>
                  <td>
                    <button type="button" className="btn btn-sucesso text-xs" onClick={adicionarItemOrcamento}>
                      + adicionar
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </>
      )}

      {abaAtiva === 'cronograma' && (
        <>
          {/* Mesmo estilo simples do Orçamento acima - mínimo/cadastrados
              em textbox readonly, `.borda-erro` só no valor que não bate. */}
          {minimoMarcosCronograma !== undefined && (
            <table className="crud-tabela mb-3">
              <tbody>
                <tr>
                  <td>Mínimo de marcos</td>
                  <td><input type="text" readOnly value={minimoMarcosCronograma} className="input-padrao" /></td>
                </tr>
                <tr>
                  <td>Marcos cadastrados</td>
                  <td><input type="text" readOnly value={cronograma.length} className={'input-padrao' + (cronograma.length >= minimoMarcosCronograma ? '' : ' borda-erro')} /></td>
                </tr>
              </tbody>
            </table>
          )}
        <div className="crud-tabela__wrapper">
          <table className="crud-tabela mb-3">
            <thead>
              <tr>
                <th>Título</th>
                <th>Data prevista</th>
                {podeEditar && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {cronograma.map((marco) => {
                const emEdicao = idMarcoEditando === marco.idMarco;
                return (
                  <tr key={marco.idMarco}>
                    {emEdicao ? (
                      <>
                        <td>
                          <input
                            type="text"
                            value={formEdicaoMarco.titulo}
                            onChange={(e) => setFormEdicaoMarco({ ...formEdicaoMarco, titulo: e.target.value })}
                            className="input-padrao"
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={formEdicaoMarco.dataPrevista}
                            min={dataInicioCampanha}
                            onChange={(e) => setFormEdicaoMarco({ ...formEdicaoMarco, dataPrevista: e.target.value })}
                            className="input-padrao"
                          />
                        </td>
                        {podeEditar && (
                          <td>
                            <div className="crud-tabela__acoes">
                              <AcaoLinha rotulo="Salvar" icone="fa-check" variante="alterar" onClick={salvarEdicaoMarco} />
                              <AcaoLinha rotulo="Cancelar" icone="fa-xmark" onClick={() => setIdMarcoEditando(null)} />
                            </div>
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        <td>{marco.titulo}</td>
                        <td>{new Date(marco.dataPrevista).toLocaleDateString('pt-BR')}</td>
                        {podeEditar && (
                          <td>
                            <div className="crud-tabela__acoes">
                              <AcaoLinha rotulo="Alterar" icone="fa-pen" variante="alterar" onClick={() => iniciarEdicaoMarco(marco)} />
                              <AcaoLinha rotulo="Consultar" icone="fa-eye" onClick={() => setMarcoConsultado(marco)} />
                              <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => removerMarco(marco.idMarco)} />
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
              {podeEditar && (
                <tr>
                  <td>
                    <input type="text" value={novoMarco.titulo} onChange={(e) => setNovoMarco({ ...novoMarco, titulo: e.target.value })} className="input-padrao" placeholder="Título" />
                  </td>
                  <td>
                    <input type="date" value={novoMarco.dataPrevista} min={dataInicioCampanha} onChange={(e) => setNovoMarco({ ...novoMarco, dataPrevista: e.target.value })} className="input-padrao" />
                  </td>
                  <td>
                    <button type="button" className="btn btn-secondary text-xs" onClick={adicionarMarco}>
                      + adicionar
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {itemOrcamentoConsultado && (
        <ModalDetalhe
          titulo="Item de orçamento"
          rotuloAcao="Consultar"
          aoFechar={() => setItemOrcamentoConsultado(null)}
          secoes={[
            { titulo: 'Categoria', conteudo: itemOrcamentoConsultado.categoria },
            { titulo: 'Valor', conteudo: formatarMoeda(itemOrcamentoConsultado.valor) },
          ]}
        />
      )}

      {marcoConsultado && (
        <ModalDetalhe
          titulo="Marco de cronograma"
          rotuloAcao="Consultar"
          aoFechar={() => setMarcoConsultado(null)}
          secoes={[
            { titulo: 'Título', conteudo: marcoConsultado.titulo },
            { titulo: 'Data prevista', conteudo: new Date(marcoConsultado.dataPrevista).toLocaleDateString('pt-BR') },
          ]}
        />
      )}
    </div>
  );
}
