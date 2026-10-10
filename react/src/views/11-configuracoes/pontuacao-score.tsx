import { useState } from 'react';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { CaixaTabela } from '../../components/crud/tabelas/caixa-tabela';
import { Tooltip } from '../../components/layout/tooltip';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { scoreConfigApi } from '../../services/11-configuracoes/api/score-config.api';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { PropsPagina } from '../../services/router/pagina.type';
import type {
  ScoreConfigResponse,
  ScoreDimensaoResponse,
  ScoreFaixaResponse,
  ScoreItemResponse,
} from '../../services/11-configuracoes/type/score-config.type';

// O peso fica como texto enquanto a pessoa digita ("7," ou vazio não viram 0 no meio do caminho).
interface ItemEditavel extends Omit<ScoreItemResponse, 'peso'> {
  peso: string;
}
interface DimensaoEditavel extends ItemEditavel {
  subitens: ItemEditavel[];
}
interface FaixaEditavel extends Omit<ScoreFaixaResponse, 'scoreMinimo' | 'scoreMaximo'> {
  scoreMinimo: string;
  scoreMaximo: string;
}

const paraEditavel = (item: ScoreItemResponse): ItemEditavel => ({ ...item, peso: String(item.peso) });
const dimensoesEditaveis = (dimensoes: ScoreDimensaoResponse[]): DimensaoEditavel[] =>
  dimensoes.map((dimensao) => ({ ...paraEditavel(dimensao), subitens: dimensao.subitens.map(paraEditavel) }));
const faixasEditaveis = (faixas: ScoreFaixaResponse[]): FaixaEditavel[] =>
  faixas.map((faixa) => ({ ...faixa, scoreMinimo: String(faixa.scoreMinimo), scoreMaximo: String(faixa.scoreMaximo) }));

const numero = (texto: string): number => (texto.trim() === '' ? Number.NaN : Number(texto.replace(',', '.')));
const pesoValido = (texto: string): boolean => {
  const valor = numero(texto);
  return Number.isFinite(valor) && valor >= 0 && valor <= 100 && Math.round(valor * 100) === valor * 100;
};
const formatarPontos = (valor: number): string =>
  valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + (valor === 1 ? ' ponto' : ' pontos');

// O que a dimensão e os pesos pedem, na ordem em que a pessoa precisa corrigir; null quando está tudo certo.
function problemaDosPesos(dimensoes: DimensaoEditavel[]): string | null {
  const todos = dimensoes.flatMap((dimensao) => [dimensao, ...dimensao.subitens]);
  if (todos.some((item) => !pesoValido(item.peso))) {
    return 'Todo valor é um número de 0 a 100, com até 2 casas decimais.';
  }
  const soma = dimensoes.filter((dimensao) => dimensao.ativo).reduce((total, dimensao) => total + numero(dimensao.peso), 0);
  if (Math.abs(soma - 100) > 0.001) {
    return `As dimensões somam ${soma.toLocaleString('pt-BR')} pontos; o total precisa ser 100.`;
  }
  const semItem = dimensoes.find(
    (dimensao) => dimensao.ativo && !dimensao.subitens.some((item) => item.ativo && numero(item.peso) > 0),
  );
  if (semItem) {
    return `"${semItem.descricao ?? semItem.nome}" precisa de pelo menos um item em uso com importância maior que zero.`;
  }
  return null;
}

// O problema de UMA dimensão, para aparecer dentro do cartão dela (a soma das dimensões é mostrada no total).
function problemaDaDimensao(dimensao: DimensaoEditavel): string | null {
  if ([dimensao, ...dimensao.subitens].some((item) => !pesoValido(item.peso))) {
    return 'Todo valor é um número de 0 a 100, com até 2 casas decimais.';
  }
  if (dimensao.ativo && !dimensao.subitens.some((item) => item.ativo && numero(item.peso) > 0)) {
    return 'Deixe pelo menos um item em uso, com importância maior que zero.';
  }
  return null;
}

// "(faltam 5)" ou "(sobram 5)" ao lado do total, para a pessoa não precisar fazer a conta.
function diferencaDoTotal(soma: number): string {
  const diferenca = Math.round((soma - 100) * 100) / 100;
  if (diferenca === 0) return '';
  const valor = Math.abs(diferenca).toLocaleString('pt-BR');
  return diferenca < 0 ? ` (faltam ${valor})` : ` (sobram ${valor})`;
}

function problemaDasFaixas(faixas: FaixaEditavel[]): string | null {
  if (faixas.some((faixa) => faixa.rotulo.trim() === '')) return 'Toda faixa precisa de um nome.';
  const limites = faixas.map((faixa) => ({ ...faixa, minimo: numero(faixa.scoreMinimo), maximo: numero(faixa.scoreMaximo) }));
  if (limites.some((faixa) => !Number.isInteger(faixa.minimo) || !Number.isInteger(faixa.maximo))) {
    return 'O início e o fim de cada faixa são números inteiros de 0 a 100.';
  }
  const invertida = limites.find((faixa) => faixa.minimo >= faixa.maximo);
  if (invertida) return `A faixa "${invertida.rotulo.trim()}" precisa terminar depois de começar.`;
  const ordem = [...limites].sort((a, b) => a.minimo - b.minimo);
  if (ordem[0].minimo !== 0 || ordem[ordem.length - 1].maximo !== 100) return 'As faixas precisam cobrir de 0 a 100.';
  for (let i = 1; i < ordem.length; i++) {
    if (ordem[i].minimo !== ordem[i - 1].maximo + 1) {
      return `"${ordem[i].rotulo.trim()}" precisa começar em ${ordem[i - 1].maximo + 1}, logo depois de "${ordem[i - 1].rotulo.trim()}".`;
    }
  }
  return null;
}

// Pontuação (score) dos pesquisadores: os pesos das 4 dimensões e dos itens de cada uma, e as faixas de reputação.
// Só peso e ligado/desligado (os itens são a estrutura que o cálculo lê); salvar recalcula todo mundo.
export function PontuacaoScore({ auth }: PropsPagina) {
  const erros = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const [dimensoes, setDimensoes] = useState<DimensaoEditavel[]>([]);
  const [faixas, setFaixas] = useState<FaixaEditavel[]>([]);
  const [original, setOriginal] = useState<ScoreConfigResponse | null>(null);
  const envioPesos = useEnvio(erros.reportarErro, erros.limparErro);
  const envioFaixas = useEnvio(erros.reportarErro, erros.limparErro);
  const [confirmando, setConfirmando] = useState<'pesos' | 'faixas' | null>(null);

  const carregar = (dado: ScoreConfigResponse) => {
    setOriginal(dado);
    setDimensoes(dimensoesEditaveis(dado.dimensoes));
    setFaixas(faixasEditaveis(dado.faixas));
  };
  const { carregando } = useBuscar(() => scoreConfigApi.buscar(auth.authFetch), [], {
    aoChegar: carregar,
    erros,
    mostraTexto: true,
  });

  const mudarItem = (idScoreConfig: number, mudanca: Partial<ItemEditavel>) =>
    setDimensoes((atuais) =>
      atuais.map((dimensao) =>
        dimensao.idScoreConfig === idScoreConfig
          ? { ...dimensao, ...mudanca }
          : {
              ...dimensao,
              subitens: dimensao.subitens.map((item) => (item.idScoreConfig === idScoreConfig ? { ...item, ...mudanca } : item)),
            },
      ),
    );
  const mudarFaixa = (idRotulo: number, mudanca: Partial<FaixaEditavel>) =>
    setFaixas((atuais) => atuais.map((faixa) => (faixa.idRotulo === idRotulo ? { ...faixa, ...mudanca } : faixa)));

  const pesosMudaram = original !== null && JSON.stringify(dimensoes) !== JSON.stringify(dimensoesEditaveis(original.dimensoes));
  const faixasMudaram = original !== null && JSON.stringify(faixas) !== JSON.stringify(faixasEditaveis(original.faixas));
  const problemaPesos = problemaDosPesos(dimensoes);
  const somaDimensoes = dimensoes
    .filter((dimensao) => dimensao.ativo && pesoValido(dimensao.peso))
    .reduce((total, dimensao) => total + numero(dimensao.peso), 0);
  const rotuloDistribuicao = `Distribuição da pontuação: ${dimensoes
    .filter((dimensao) => dimensao.ativo)
    .map((dimensao) => `${dimensao.descricao ?? dimensao.nome}, ${dimensao.peso}`)
    .join('; ')}`;
  const problemaFaixas = faixas.length > 0 ? problemaDasFaixas(faixas) : null;
  const faixasNaRegua = faixas
    .map((faixa) => ({ faixa, minimo: numero(faixa.scoreMinimo), maximo: numero(faixa.scoreMaximo) }))
    .filter(({ minimo, maximo }) => Number.isInteger(minimo) && Number.isInteger(maximo) && minimo <= maximo)
    .sort((a, b) => a.minimo - b.minimo);
  const rotuloRegua = `Faixas: ${faixasNaRegua.map(({ faixa, minimo, maximo }) => `${faixa.rotulo}, de ${minimo} a ${maximo}`).join('; ')}`;

  const salvarPesos = () =>
    envioPesos.executar(async () => {
      const itens = dimensoes.flatMap((dimensao) => [dimensao, ...dimensao.subitens]);
      carregar(
        await scoreConfigApi.salvarPesos(
          auth.authFetch,
          itens.map((item) => ({ idScoreConfig: item.idScoreConfig, peso: numero(item.peso), ativo: item.ativo })),
        ),
      );
      mostrar('Pesos salvos.', 'A pontuação de todos os pesquisadores foi recalculada.');
    });
  const salvarFaixas = () =>
    envioFaixas.executar(async () => {
      carregar(
        await scoreConfigApi.salvarFaixas(
          auth.authFetch,
          faixas.map((faixa) => ({
            ...faixa,
            rotulo: faixa.rotulo.trim(),
            descricao: faixa.descricao?.trim() || null,
            scoreMinimo: numero(faixa.scoreMinimo),
            scoreMaximo: numero(faixa.scoreMaximo),
          })),
        ),
      );
      mostrar('Faixas salvas.', 'O rótulo de todos os pesquisadores foi recalculado.');
    });

  return (
    <div className="admin-content-painel">
      <section className="crud-secao">
        <div className="crud-secao__cabecalho">
          <div className="flex items-center gap-2">
            <h1 className="titulo-secao">Pontuação (Score)</h1>
            <Tooltip
              texto="A pontuação de 0 a 100 de cada pesquisador é calculada sozinha pelo sistema, com as regras desta tela. Salvar recalcula a pontuação de todos."
              baixo
            />
          </div>
        </div>

        <MensagemErro texto={erros.erro} className="crud-erro" />
        {carregando && original === null ? (
          <p className="legenda texto-fraco">carregando...</p>
        ) : (
          <>
            {/* As explicações ficam na dica, não na tela: menos texto à vista (fadiga visual). */}
            <h2 className="titulo-bloco titulo-bloco--linha flex items-center gap-2">
              Pesos
              <Tooltip texto={'A pontuação vai de 0 a 100 e é dividida em 4 dimensões; os máximos das quatro somam 100. Dentro de cada dimensão, os itens dividem os pontos conforme a importância: importância 2 vale o dobro de importância 1. Desmarcar "usar" tira o item da conta, e a parte dele vai para os outros itens da dimensão. Quantas denúncias procedentes zeram a Reputação da Comunidade se ajusta em Parâmetros do Sistema.'} />
            </h2>
            {/* Distribuição: como os 100 pontos se dividem entre as dimensões ligadas (padrão de "limite por grupo" das
                telas de pontuação de mercado), atualizada enquanto a pessoa digita. */}
            <div className="mb-6">
              <p className="rotulo-campo">Divisão dos pontos</p>
              <div className="distribuicao-score__barra" role="img" aria-label={rotuloDistribuicao}>
                {dimensoes.map((dimensao, indice) =>
                  dimensao.ativo && pesoValido(dimensao.peso) ? (
                    <span
                      key={dimensao.idScoreConfig}
                      className={`distribuicao-score__parte--${(indice % 4) + 1}`}
                      style={{ width: `${Math.min(100, numero(dimensao.peso))}%` }}
                    ></span>
                  ) : null,
                )}
              </div>
              <ul className="distribuicao-score__legenda">
                {dimensoes.map((dimensao, indice) => (
                  <li key={dimensao.idScoreConfig} className="distribuicao-score__item legenda">
                    <span className={`distribuicao-score__cor distribuicao-score__parte--${(indice % 4) + 1}`}></span>
                    {dimensao.descricao ?? dimensao.nome}
                    <span className="enfase">{pesoValido(dimensao.peso) ? formatarPontos(numero(dimensao.peso)) : '-'}</span>
                  </li>
                ))}
                <li className={'distribuicao-score__item legenda-destaque' + (Math.abs(somaDimensoes - 100) < 0.001 ? '' : ' texto-erro')}>
                  Total: {somaDimensoes.toLocaleString('pt-BR')} de 100 pontos{diferencaDoTotal(somaDimensoes)}
                </li>
              </ul>
            </div>
            {/* Uma dimensão por cartão, na largura inteira: o nome do item cabe numa linha (DS-100). */}
            <div className="grid gap-4">
              {dimensoes.map((dimensao, indice) => {
                const pesoDimensao = pesoValido(dimensao.peso) ? numero(dimensao.peso) : 0;
                const somaItens = dimensao.subitens
                  .filter((item) => item.ativo && pesoValido(item.peso))
                  .reduce((total, item) => total + numero(item.peso), 0);
                const problema = problemaDaDimensao(dimensao);
                return (
                  <fieldset
                    key={dimensao.idScoreConfig}
                    className={'border rounded-lg p-4 min-w-0 ' + (problema ? 'borda-erro' : 'borda-padrao')}
                  >
                    <legend className="enfase px-1 inline-flex items-center gap-2">
                      <span className={`distribuicao-score__cor distribuicao-score__parte--${(indice % 4) + 1}`}></span>
                      {dimensao.descricao ?? dimensao.nome}
                    </legend>
                    {/* Cabeçalho do cartão: os pontos máximos na mesma linha da explicação, e a tabela embaixo, na largura
                        inteira (ao lado da tabela, o campo deixava uma coluna quase vazia). */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <p className="legenda texto-fraco">
                        Os itens abaixo dividem estes {formatarPontos(pesoDimensao)} conforme a importância de cada um.
                      </p>
                      <div className="flex items-center gap-3">
                        <label className="rotulo-campo mb-0" htmlFor={`peso-${dimensao.idScoreConfig}`}>
                          Pontos máximos da dimensão
                        </label>
                        <input
                          id={`peso-${dimensao.idScoreConfig}`}
                          type="text"
                          inputMode="decimal"
                          value={dimensao.peso}
                          onChange={(evento) => mudarItem(dimensao.idScoreConfig, { peso: evento.target.value })}
                          className={'input-padrao text-center w-28' + (pesoValido(dimensao.peso) ? '' : ' borda-erro')}
                        />
                      </div>
                    </div>
                    {problema && (
                      <p className="legenda-destaque erro-campo mb-3" role="alert">
                        {problema}
                      </p>
                    )}
                    <div className="min-w-0">
                      <CaixaTabela rotulo={`Itens de "${dimensao.descricao ?? dimensao.nome}"`}>
                        {/* Larguras fixas: as 4 tabelas ficam com as colunas alinhadas, e "item" fica com o resto. min-w: no
                            celular, a tabela rola de lado dentro da caixa em vez de espremer o nome do item. */}
                        <table className="crud-tabela table-fixed min-w-md">
                          <colgroup>
                            <col />
                            {/* Usar, importância e pontos com a mesma largura: centralizados, ficam à mesma distância um do outro.
                                7rem é o que "pontos" precisa ("9,2 pontos") e cabe a importância com 3 dígitos. */}
                            <col className="w-28" />
                            <col className="w-28" />
                            <col className="w-28" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th>item</th>
                              <th className="crud-tabela__celula--centralizada">usar</th>
                              <th className="crud-tabela__celula--centralizada">importância</th>
                              <th className="crud-tabela__celula--centralizada">pontos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dimensao.subitens.map((item) => {
                              const vale =
                                item.ativo && somaItens > 0 && pesoValido(item.peso)
                                  ? (numero(item.peso) / somaItens) * pesoDimensao
                                  : 0;
                              const rotulo = item.descricao ?? item.nome;
                              return (
                                <tr key={item.idScoreConfig} className={item.ativo ? undefined : 'texto-fraco'}>
                                  <td className="crud-tabela__col--texto">{rotulo}</td>
                                  <td className="crud-tabela__celula--centralizada">
                                    <input
                                      type="checkbox"
                                      aria-label={`Usar "${rotulo}" na pontuação`}
                                      checked={item.ativo}
                                      onChange={(evento) => mudarItem(item.idScoreConfig, { ativo: evento.target.checked })}
                                    />
                                  </td>
                                  <td className="crud-tabela__celula--centralizada">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      aria-label={`Importância de "${rotulo}"`}
                                      value={item.peso}
                                      onChange={(evento) => mudarItem(item.idScoreConfig, { peso: evento.target.value })}
                                      className={'input-padrao text-center' + (pesoValido(item.peso) ? '' : ' borda-erro')}
                                    />
                                  </td>
                                  <td className="crud-tabela__celula--centralizada whitespace-nowrap">
                                    {item.ativo ? formatarPontos(vale) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </CaixaTabela>
                    </div>
                  </fieldset>
                );
              })}
            </div>
            <div className={'mt-3 mb-8' + (pesosMudaram ? ' barra-salvar--fixa' : '')}>
              {pesosMudaram && (
                <p
                  className={'legenda-destaque mb-2' + (problemaPesos ? ' erro-campo' : ' texto-fraco')}
                  role={problemaPesos ? 'alert' : undefined}
                >
                  {problemaPesos ?? 'Pesos alterados, ainda não salvos.'}
                </p>
              )}
              <RodapeAcoes
                rotuloCancelar="Desfazer"
                aoCancelar={() => original && setDimensoes(dimensoesEditaveis(original.dimensoes))}
                cancelarDesabilitado={!pesosMudaram || envioPesos.ocupado}
                acao={{
                  rotulo: 'Salvar pesos',
                  rotuloOcupado: 'Salvando...',
                  ocupado: envioPesos.ocupado,
                  desabilitado: !pesosMudaram || problemaPesos !== null,
                  aoClicar: () => setConfirmando('pesos'),
                }}
              />
            </div>

            <h2 className="titulo-bloco titulo-bloco--linha flex items-center gap-2">
              Faixas de reputação
              <Tooltip texto="Cada pontuação de 0 a 100 cai em uma faixa só: a próxima começa logo depois de onde a anterior termina." />
            </h2>
            {/* Régua: mostra na hora buraco (parte sem cor) ou sobreposição entre faixas, como a barra dos pesos. */}
            <div className="mb-6">
              <p className="rotulo-campo">Divisão das faixas</p>
              <div className="regua-faixas" role="img" aria-label={rotuloRegua}>
                {faixasNaRegua.map(({ faixa, minimo, maximo }, indice) => (
                  <span
                    key={faixa.idRotulo}
                    className={`regua-faixas__parte regua-faixas__parte--${(indice % 4) + 1}`}
                    style={{ left: `${(minimo / 101) * 100}%`, width: `${((maximo - minimo + 1) / 101) * 100}%` }}
                  ></span>
                ))}
              </div>
              <ul className="distribuicao-score__legenda">
                {faixasNaRegua.map(({ faixa, minimo, maximo }, indice) => (
                  <li key={faixa.idRotulo} className="distribuicao-score__item legenda">
                    <span className={`distribuicao-score__cor regua-faixas__parte--${(indice % 4) + 1}`}></span>
                    {faixa.rotulo}
                    <span className="enfase">
                      de {minimo} a {maximo}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <CaixaTabela rotulo="Faixas de reputação">
              {/* Nome só com o espaço de "Em Construção" (o maior rótulo padrão); de e até com 3 dígitos, como o peso;
                  descrição fica com o resto. min-w: no celular, rola de lado dentro da caixa. */}
              <table className="crud-tabela table-fixed min-w-xl">
                <colgroup>
                  <col className="w-44" />
                  <col />
                  <col className="w-28" />
                  <col className="w-28" />
                </colgroup>
                <thead>
                  <tr>
                    <th>nome</th>
                    <th>descrição</th>
                    <th className="crud-tabela__celula--centralizada">de</th>
                    <th className="crud-tabela__celula--centralizada">até</th>
                  </tr>
                </thead>
                <tbody>
                  {faixas.map((faixa) => (
                    <tr key={faixa.idRotulo}>
                      <td>
                        <input
                          type="text"
                          aria-label="Nome da faixa"
                          value={faixa.rotulo}
                          maxLength={50}
                          onChange={(evento) => mudarFaixa(faixa.idRotulo, { rotulo: evento.target.value })}
                          className="input-padrao"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          aria-label={`Descrição da faixa "${faixa.rotulo}"`}
                          value={faixa.descricao ?? ''}
                          maxLength={255}
                          onChange={(evento) => mudarFaixa(faixa.idRotulo, { descricao: evento.target.value })}
                          className="input-padrao"
                        />
                      </td>
                      <td className="crud-tabela__celula--centralizada">
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Início da faixa "${faixa.rotulo}"`}
                          value={faixa.scoreMinimo}
                          onChange={(evento) => mudarFaixa(faixa.idRotulo, { scoreMinimo: evento.target.value })}
                          className="input-padrao text-center"
                        />
                      </td>
                      <td className="crud-tabela__celula--centralizada">
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Fim da faixa "${faixa.rotulo}"`}
                          value={faixa.scoreMaximo}
                          onChange={(evento) => mudarFaixa(faixa.idRotulo, { scoreMaximo: evento.target.value })}
                          className="input-padrao text-center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CaixaTabela>
            <div className={'mt-3' + (faixasMudaram ? ' barra-salvar--fixa' : '')}>
              {faixasMudaram && (
                <p
                  className={'legenda-destaque mb-2' + (problemaFaixas ? ' erro-campo' : ' texto-fraco')}
                  role={problemaFaixas ? 'alert' : undefined}
                >
                  {problemaFaixas ?? 'Faixas alteradas, ainda não salvas.'}
                </p>
              )}
              <RodapeAcoes
                rotuloCancelar="Desfazer"
                aoCancelar={() => original && setFaixas(faixasEditaveis(original.faixas))}
                cancelarDesabilitado={!faixasMudaram || envioFaixas.ocupado}
                acao={{
                  rotulo: 'Salvar faixas',
                  rotuloOcupado: 'Salvando...',
                  ocupado: envioFaixas.ocupado,
                  desabilitado: !faixasMudaram || problemaFaixas !== null,
                  aoClicar: () => setConfirmando('faixas'),
                }}
              />
            </div>
          </>
        )}
      </section>
      {confirmando && (
        <ModalConfirmacao
          titulo={confirmando === 'pesos' ? 'Salvar os novos pesos?' : 'Salvar as novas faixas?'}
          rotuloConfirmar="Salvar e recalcular"
          rotuloOcupado="Salvando..."
          ocupado={envioPesos.ocupado || envioFaixas.ocupado}
          aoConfirmar={() => void (confirmando === 'pesos' ? salvarPesos() : salvarFaixas()).finally(() => setConfirmando(null))}
          aoCancelar={() => setConfirmando(null)}
        >
          <p>
            {confirmando === 'pesos'
              ? 'A pontuação de todos os pesquisadores é recalculada na hora, e a nova pontuação aparece no perfil público de cada um.'
              : 'A faixa de reputação de todos os pesquisadores é recalculada na hora, e a nova faixa aparece no perfil público de cada um.'}
          </p>
        </ModalConfirmacao>
      )}
    </div>
  );
}
