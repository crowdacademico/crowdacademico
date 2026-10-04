import { useState } from 'react';
import { MensagemErro } from '../../components/crud/mensagem-erro';
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
    return 'Todo peso é um número de 0 a 100, com até 2 casas decimais.';
  }
  const soma = dimensoes.filter((dimensao) => dimensao.ativo).reduce((total, dimensao) => total + numero(dimensao.peso), 0);
  if (Math.abs(soma - 100) > 0.001) {
    return `As dimensões somam ${soma.toLocaleString('pt-BR')} pontos e precisam somar 100.`;
  }
  const semItem = dimensoes.find(
    (dimensao) => dimensao.ativo && !dimensao.subitens.some((item) => item.ativo && numero(item.peso) > 0),
  );
  if (semItem) {
    return `"${semItem.descricao ?? semItem.nome}" precisa de pelo menos um item ligado com peso maior que zero.`;
  }
  return null;
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
  const problemaFaixas = faixas.length > 0 ? problemaDasFaixas(faixas) : null;

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
              texto="A pontuação de 0 a 100 de cada pesquisador, calculada pelo banco. O peso da dimensão é o máximo dela; cada item vale a sua parte (o peso dele dividido pela soma dos itens ligados). Salvar recalcula a pontuação de todos."
              baixo
            />
          </div>
        </div>

        <MensagemErro texto={erros.erro} className="crud-erro" />
        {carregando && original === null ? (
          <p className="legenda texto-fraco">carregando...</p>
        ) : (
          <>
            <h2 className="titulo-bloco titulo-bloco--linha">Pesos</h2>
            <p className="paragrafo texto-fraco mb-3">
              As dimensões ligadas somam 100. Desligar um item passa a parte dele para os outros itens da mesma
              dimensão. Quantas denúncias procedentes zeram a reputação fica em Parâmetros do Sistema
              (score_denuncias_para_zerar).
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {dimensoes.map((dimensao) => {
                const pesoDimensao = pesoValido(dimensao.peso) ? numero(dimensao.peso) : 0;
                const somaItens = dimensao.subitens
                  .filter((item) => item.ativo && pesoValido(item.peso))
                  .reduce((total, item) => total + numero(item.peso), 0);
                return (
                  <fieldset key={dimensao.idScoreConfig} className="border borda-padrao rounded-lg p-4 min-w-0">
                    <legend className="enfase px-1">{dimensao.descricao ?? dimensao.nome}</legend>
                    <label className="rotulo-campo" htmlFor={`peso-${dimensao.idScoreConfig}`}>
                      Peso da dimensão (máximo de pontos)
                    </label>
                    <input
                      id={`peso-${dimensao.idScoreConfig}`}
                      type="text"
                      inputMode="decimal"
                      value={dimensao.peso}
                      onChange={(evento) => mudarItem(dimensao.idScoreConfig, { peso: evento.target.value })}
                      className={'input-padrao mb-3' + (pesoValido(dimensao.peso) ? '' : ' borda-erro')}
                    />
                    <CaixaTabela rotulo={`Itens de "${dimensao.descricao ?? dimensao.nome}"`}>
                      {/* Larguras fixas: as 4 tabelas ficam com as colunas alinhadas, e "item" fica com o resto. min-w: no
                          celular, a tabela rola de lado dentro da caixa em vez de espremer o nome do item. */}
                      <table className="crud-tabela table-fixed min-w-md">
                        <colgroup>
                          <col />
                          {/* Ligado, peso e vale com a mesma largura: centralizados, ficam à mesma distância um do outro.
                              7rem é o que o "vale" precisa ("9,2 pontos") e cabe o peso com 3 dígitos. */}
                          <col className="w-28" />
                          <col className="w-28" />
                          <col className="w-28" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>item</th>
                            <th className="crud-tabela__celula--centralizada">ligado</th>
                            <th className="crud-tabela__celula--centralizada">peso</th>
                            <th className="crud-tabela__celula--centralizada">vale</th>
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
                              <tr key={item.idScoreConfig}>
                                <td>{rotulo}</td>
                                <td className="crud-tabela__celula--centralizada">
                                  <input
                                    type="checkbox"
                                    aria-label={`Ligar "${rotulo}"`}
                                    checked={item.ativo}
                                    onChange={(evento) => mudarItem(item.idScoreConfig, { ativo: evento.target.checked })}
                                  />
                                </td>
                                <td className="crud-tabela__celula--centralizada">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    aria-label={`Peso de "${rotulo}"`}
                                    value={item.peso}
                                    onChange={(evento) => mudarItem(item.idScoreConfig, { peso: evento.target.value })}
                                    className={'input-padrao text-center' + (pesoValido(item.peso) ? '' : ' borda-erro')}
                                  />
                                </td>
                                <td className="crud-tabela__celula--centralizada whitespace-nowrap">{formatarPontos(vale)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </CaixaTabela>
                  </fieldset>
                );
              })}
            </div>
            {problemaPesos && pesosMudaram && (
              <p className="legenda-destaque erro-campo mt-3" role="alert">
                {problemaPesos}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-3 mb-8">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!pesosMudaram || envioPesos.ocupado}
                onClick={() => original && setDimensoes(dimensoesEditaveis(original.dimensoes))}
              >
                Desfazer
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!pesosMudaram || problemaPesos !== null || envioPesos.ocupado}
                onClick={() => void salvarPesos()}
              >
                {envioPesos.ocupado ? 'Salvando...' : 'Salvar pesos'}
              </button>
            </div>

            <h2 className="titulo-bloco titulo-bloco--linha">Faixas de reputação</h2>
            <p className="paragrafo texto-fraco mb-3">
              Cada pontuação de 0 a 100 cai em uma faixa só: a próxima começa logo depois de onde a anterior termina.
            </p>
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
            {problemaFaixas && faixasMudaram && (
              <p className="legenda-destaque erro-campo mt-3" role="alert">
                {problemaFaixas}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!faixasMudaram || envioFaixas.ocupado}
                onClick={() => original && setFaixas(faixasEditaveis(original.faixas))}
              >
                Desfazer
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!faixasMudaram || problemaFaixas !== null || envioFaixas.ocupado}
                onClick={() => void salvarFaixas()}
              >
                {envioFaixas.ocupado ? 'Salvando...' : 'Salvar faixas'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
