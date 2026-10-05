import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MensagemErro } from './mensagem-erro';
import { TextoResumido } from './texto-resumido';
import { EstadoVazio, type ConteudoEstadoVazio } from './estado-vazio';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { TIPOS_COLUNA, type NomeTipoColuna } from './colunas/tipos-coluna';
import { DISTRIBUICAO_COLUNAS } from './colunas/distribuicao';
import { CabecalhoAcoes, CelulaAcoes, type AcaoIndisponivel, type AcoesLinha } from './colunas/5-coluna-acoes';
import { BarraFiltros } from '../search/barra-filtros';
import { Tooltip } from '../layout/tooltip';
import { paginarClientSide } from '../../services/constant/util/paginacao.util';
import { RodapePaginacao } from '../pagination/rodape-paginacao';
import { TAMANHOS_PAGINA } from '../pagination/tamanhos-pagina.constants';
import { normalizarBusca } from '../../services/constant/util/busca.util';
import { useBuscar } from '../../services/constant/hook/use-buscar';

// `object`, não `Record<string, unknown>`: toda linha real é uma interface nomeada espelhando um DTO do Nest
// (UsuarioResponse, etc.); interface sem assinatura de índice própria não satisfaz `Record<string, unknown>`
// como argumento de tipo genérico (o TS exige a assinatura de índice no tipo NOMEADO, só literal solto ganha a
// folga estrutural), mesmo sendo perfeitamente indexável via `keyof T`, que é tudo que este arquivo precisa.
type Linha = object;

// `tipo` decide largura, alinhamento, formato, ordenação e busca da coluna (ver components/crud/colunas/): a
// tela nunca escreve largura nem alinhamento na mão, e a mesma espécie de coluna fica igual em toda tabela.
// `renderizar` troca só o que aparece na célula (ex.: um rótulo traduzido); o resto continua vindo do tipo.
interface Coluna<T extends Linha> {
  chave: keyof T & string;
  rotulo: string;
  tipo: NomeTipoColuna;
  quebrarRotulo?: boolean;
  renderizar?: (linha: T) => ReactNode;
  // Texto que pode ser longo (alvo, título de campanha): uma linha só, com "ler tudo" que expande a linha.
  umaLinha?: boolean;
}

interface FiltroFacetado<T extends Linha> {
  chave: keyof T & string;
  rotulo: string;
  ordem?: readonly string[];
  // `rotulos`: opcional, traduz o valor CRU para um texto amigável só na exibição do dropdown (botão + opções);
  // o filtro em si continua comparando/gravando na URL o valor cru (`atualizarParametros`), nunca o traduzido.
  // Mesmo espírito de permissao-nomes-amigaveis.constants.ts: camada de exibição por cima do dado, sem mudar o dado.
  rotulos?: Record<string, string>;
}

interface GenericTableProps<T extends Linha> {
  titulo: string;
  // Na maioria das telas a tabela É a página, então o título dela é o h1 (um por página, o que leitor de tela
  // e axe esperam). Numa página com mais de uma seção (Papéis e Permissões), as seguintes passam `2`. O visual
  // é o mesmo nos dois níveis (classe `titulo-secao`).
  nivelTitulo?: 1 | 2;
  // Uma frase embaixo do título dizendo para que serve a lista (padrão de mercado: "Gerencie...", "Acompanhe...").
  // Explicação da tela num "ⓘ" ao lado do título (aparece ao passar o mouse). Não é um subtítulo de propósito:
  // um parágrafo a mais deixava o cabeçalho mais alto que o das outras listas e a tela "dançava" ao trocar.
  ajuda?: string;
  acaoTopo?: ReactNode;
  colunas: Coluna<T>[];
  chavePrimaria: keyof T & string;
  listar: () => Promise<T[]>;
  // Contrato das ações (handler dentro da própria chave): ver 5-coluna-acoes.tsx.
  acoes?: AcoesLinha<T>;
  // Ação que existe na tabela mas não se aplica a uma linha: aparece apagada, com o motivo na dica.
  acaoIndisponivel?: AcaoIndisponivel<T>;
  filtrosFacetados?: FiltroFacetado<T>[];
  // Lista vazia (sem filtro): o que apareceria aqui e o próximo passo. Sem isto, uma mensagem genérica.
  vazio?: ConteudoEstadoVazio;
}

const VAZIO_PADRAO: ConteudoEstadoVazio = { icone: 'fa-inbox', titulo: 'Nada por aqui ainda.' };
const VAZIO_FILTRO: ConteudoEstadoVazio = {
  icone: 'fa-magnifying-glass',
  titulo: 'Nenhum registro bate com o filtro.',
  texto: 'Tente outro termo ou limpe os filtros.',
};

// Piso de largura de nome/texto pelo conteúdo: o maior valor da lista inteira em `ch` (+2 de respiro), limitado
// por `--coluna-piso-maximo` (5-crud.css), que diminui em tela estreita para a coluna poder quebrar a linha.
function maiorTexto<T extends Linha>(coluna: Coluna<T>, linhas: T[]): number {
  const tipo = TIPOS_COLUNA[coluna.tipo];
  let maior = coluna.rotulo.length;
  linhas.forEach((linha) => {
    maior = Math.max(maior, tipo.texto(linha[coluna.chave]).length);
  });
  return maior;
}

// Tabela genérica de LISTAGEM (leitura, filtro, ordenação, paginação) usada pelo painel admin: cada módulo novo
// do Nest com listagem simples vira só uma entrada de colunas aqui, não uma tela nova escrita do zero.
//
// Criar/Alterar/Excluir NÃO acontecem embutidos nesta tabela: abrem modal no componente pai via `acoes` (ver
// comentário da prop, acima). Sem `acoes` (catálogos só-leitura como Permissões), não aparece coluna de Ações
// nenhuma.
//
// O botão "Ver log" + painel de auditoria NÃO moram aqui: são `BlocoLogAuditoria`, componente irmão colocado
// pelas telas que precisam logo abaixo do `<GenericTable>`, não uma prop daqui.
//
// TESTE PARA QUALQUER PROP NOVA que alguém for tentado a adicionar aqui: uma prop pertence a ESTE componente se
// uma tela que não é "do tipo dele" (uma tela sem tabela nenhuma) conseguiria viver sem ela.
// `filtrosFacetados` passa nesse teste: são configuração de TABELA. `buscarLog` não passava: é
// outra funcionalidade (dados/paginação/visual próprios) que só por acaso costumava aparecer embaixo de uma
// tabela. "Quantas telas já usam a prop" NÃO é o teste: era usada por 8 das 10 telas e ainda assim não
// pertencia aqui.
//
// SEGUNDO TESTE, complementar (o teste acima só decide ENTRADA, não SAÍDA): se uma tela que NÃO PODE usar este
// componente ainda assim precisa de algo que hoje mora aqui dentro, isto é um IRMÃO, não um miolo: foi esse
// critério que fez o `BlocoLogAuditoria` nascer, e o mesmo que tirou o rodapé de paginação e a barra de filtros
// de dentro daqui (ver `components/pagination/rodape-paginacao.tsx` e `components/search/barra-filtros.tsx`):
// as bancadas (risco de linha impede usar a tabela) precisavam dos dois mesmo assim.

export function GenericTable<T extends Linha>({
  titulo,
  nivelTitulo = 1,
  ajuda,
  acaoTopo,
  colunas,
  chavePrimaria,
  listar,
  acoes,
  acaoIndisponivel,
  // Filtros por faceta: array de `{ chave, rotulo, ordem? }`. Genérico: funciona para QUALQUER coluna com
  // valores discretos (ex.: papel, impacto), e as opções de cada dropdown são derivadas sozinhas a partir dos
  // valores que já aparecem em `linha[chave]` (célula com vários valores separada por ", ", mesma convenção da
  // coluna "papel" de ListarUsuarios; célula de valor único também funciona, vira uma lista de 1 token). Cada
  // faceta é independente (marcar em uma não mexe nas outras) e se combinam com E entre si (dentro da mesma
  // faceta é OU); o padrão de cada uma é "Todos" (nenhuma opção marcada = sem filtro nenhum, mostra tudo).
  // `ordem` (opcional, por faceta): lista com a ordem exata desejada (ex.: papel do menor para o maior poder);
  // sem isso, cai no alfabético (pt-BR). Valor que aparecer nos dados mas não estiver em `ordem` vai para o
  // final da lista, não desaparece.
  filtrosFacetados,
  vazio,
}: GenericTableProps<T>) {
  // A coluna Ações existe se pelo menos 1 handler foi passado em `acoes`.
  const temAcoes = Boolean(acoes?.alterar || acoes?.consultar || acoes?.excluir);
  const { dado, carregando, erro } = useBuscar(listar, [listar], { mostraTexto: true });
  const linhas = useMemo(() => dado ?? [], [dado]);
  // Filtro/página/ordenação/faceta vivem na URL (query string), não em useState local: uma navegação que
  // desmontasse a página de listagem resetaria o filtro escolhido, e useState não sobrevive a isso. `{ replace:
  // true }` em toda escrita: cada clique em filtro/página/ordenação SUBSTITUI a entrada atual do histórico em
  // vez de empilhar uma nova.
  // Nomes reservados na URL: q, pagina, tamanho, ordenar, dir: evitar faceta com uma dessas `chave`.
  const [searchParams, setSearchParams] = useSearchParams();

  const atualizarParametros = (atualizacoes: Record<string, string | number | null | undefined>) => {
    setSearchParams((atuais) => {
      const novos = new URLSearchParams(atuais);
      Object.entries(atualizacoes).forEach(([chave, valor]) => {
        if (valor === null || valor === undefined || valor === '') {
          novos.delete(chave);
        } else {
          novos.set(chave, String(valor));
        }
      });
      return novos;
    }, { replace: true });
  };

  const filtro = searchParams.get('q') ?? '';
  const pagina = Number(searchParams.get('pagina')) || 1;
  const tamanhoPaginaParam = searchParams.get('tamanho');
  const tamanhoPagina =
    tamanhoPaginaParam === 'todos' ? 'todos' : Number(tamanhoPaginaParam) || TAMANHOS_PAGINA[0];
  // Memoizado (não objeto literal solto) - senão vira uma referência nova
  // a cada render, e o useMemo de linhasOrdenadas (que depende disto)
  // recalcularia sempre, mesmo sem a ordenação ter mudado de verdade.
  const ordenacao = useMemo(
    () => ({
      chave: searchParams.get('ordenar') || null,
      direcao: searchParams.get('dir') === 'desc' ? 'desc' : 'asc',
    }),
    [searchParams],
  );
  // Seleção de cada faceta, independente: { [chave]: string[] }. Faceta
  // sem entrada aqui (ou array vazio) = "Todos" pra ela.
  const selecoesPorFaceta = useMemo(() => {
    const resultado: Record<string, string[]> = {};
    (filtrosFacetados ?? []).forEach((faceta) => {
      const valor = searchParams.get(faceta.chave);
      resultado[faceta.chave] = valor ? valor.split(',').filter(Boolean) : [];
    });
    return resultado;
  }, [searchParams, filtrosFacetados]);

  // Opções de CADA dropdown de faceta - derivadas dos dados que já
  // chegaram (não da lista FILTRADA, senão as opções desapareceriam/
  // reapareceriam conforme a pessoa digita no campo de busca ou marca
  // outra faceta, confuso). Sempre a partir de `linhas` inteira. Com
  // `ordem` na faceta, respeita essa ordem (ex.: papel do menor pro maior
  // poder, impacto de baixo pro alto); sem isso, alfabético (pt-BR).
  // `{ [chave]: string[] }`, uma entrada por faceta.
  const opcoesPorFaceta = useMemo(() => {
    const resultado: Record<string, string[]> = {};
    (filtrosFacetados ?? []).forEach((faceta) => {
      const valores = new Set<string>();
      linhas.forEach((linha) => {
        String(linha[faceta.chave] ?? '')
          .split(',')
          .map((valor) => valor.trim())
          .filter(Boolean)
          .forEach((valor) => valores.add(valor));
      });
      const lista = [...valores];
      const ordem = faceta.ordem;
      if (ordem) {
        const posicao = (valor: string): number => {
          const indice = ordem.indexOf(valor);
          return indice === -1 ? ordem.length : indice;
        };
        lista.sort((a, b) => posicao(a) - posicao(b) || a.localeCompare(b, 'pt-BR'));
      } else {
        lista.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      }
      resultado[faceta.chave] = lista;
    });
    return resultado;
  }, [linhas, filtrosFacetados]);

  // Faceta com pelo menos 1 seleção marcada (as com array vazio/ausente
  // contam como "Todos", não filtram nada) - usado tanto no filtro quanto
  // pra saber se deve mostrar "Nenhum registro bate com o filtro."
  const algumaFacetaAtiva = (filtrosFacetados ?? []).some(
    (faceta) => selecoesPorFaceta[faceta.chave].length > 0,
  );

  // Filtro é só client-side (a lista inteira já veio do backend) - resolve
  // "achar uma linha no meio de 28" (Configurações já tem esse tanto), mas
  // não resolve buscar num universo de milhares sem baixar tudo primeiro -
  // isso exigiria busca no próprio backend (LIMIT/OFFSET + WHERE), fora do
  // escopo desta rodada.
  const linhasFiltradas = useMemo(() => {
    let base = linhas;

    // Facetas primeiro (nenhuma marcada em cada uma = "Todos", sem filtro nenhum), texto depois. Entre facetas
    // DIFERENTES é E (uma linha só sobrevive se bater em TODAS as que têm seleção); dentro da MESMA faceta é OU
    // (basta bater em uma das opções marcadas).
    (filtrosFacetados ?? []).forEach((faceta) => {
      const selecionados = selecoesPorFaceta[faceta.chave];
      if (selecionados.length > 0) {
        base = base.filter((linha) => {
          const valoresDaLinha = String(linha[faceta.chave] ?? '')
            .split(',')
            .map((valor) => valor.trim());
          return valoresDaLinha.some((valor) => selecionados.includes(valor));
        });
      }
    });

    const termo = normalizarBusca(filtro);
    if (!termo) {
      return base;
    }
    // Procura no que a pessoa VÊ na célula (ex.: "R$ 1.000,00", "Sim") e também no valor cru.
    return base.filter((linha) =>
      colunas.some((coluna) => {
        const valor = linha[coluna.chave];
        const visto = TIPOS_COLUNA[coluna.tipo].texto(valor);
        return normalizarBusca(`${visto} ${String(valor ?? '')}`).includes(termo);
      }),
    );
  }, [linhas, filtro, colunas, filtrosFacetados, selecoesPorFaceta]);

  // Ordena a lista FILTRADA inteira, antes de paginar, nunca a página atual sozinha: ordenar só a fatia visível
  // é o jeito clássico desse tipo de recurso "bugar com paginação" (linha some da vista ao virar página, ordem
  // parece errada entre páginas). Quem sabe comparar é o tipo da coluna (sempre pelo valor cru).
  const linhasOrdenadas = useMemo(() => {
    // `ordenacao.chave` vem cru da URL: conferir contra `colunas` prova o tipo sem `as`, e uma URL antiga
    // apontando para uma coluna que não existe mais só fica sem ordenação.
    const colunaOrdenada = colunas.find((coluna) => coluna.chave === ordenacao.chave);
    if (!colunaOrdenada) {
      return linhasFiltradas;
    }
    const { chave, tipo } = colunaOrdenada;
    const comparar = TIPOS_COLUNA[tipo].comparar;
    const sinal = ordenacao.direcao === 'asc' ? 1 : -1;
    // Vazio fica sempre no fim, nas duas direções (padrão de planilha): senão, ao inverter, as linhas sem valor
    // pulavam para o topo, na frente do maior valor.
    const vazio = (valor: unknown) => valor === null || valor === undefined || valor === '';
    return [...linhasFiltradas].sort((a, b) => {
      const vazioA = vazio(a[chave]);
      const vazioB = vazio(b[chave]);
      if (vazioA || vazioB) {
        return Number(vazioA) - Number(vazioB);
      }
      return comparar(a[chave], b[chave]) * sinal;
    });
  }, [linhasFiltradas, ordenacao, colunas]);

  // `quebrarRotulo`: um rótulo como "e-mail verificado" quebraria pelo espaço sobrando na coluna, que pula
  // toda vez que outra coisa muda por perto (Ações vira ícone, sidebar some), oscilando entre quebrado e
  // inteiro. Em vez disso, uma quebra MANUAL antes da última palavra, escondida por padrão e só ligada abaixo
  // de um breakpoint fixo de JANELA (`.crud-tabela__quebra-rotulo`, 5-crud.css): muda uma vez só, sempre no
  // mesmo lugar. O `+ 1` do `slice` mantém o espaço na primeira metade; sem ele, com o <br> escondido, as duas
  // metades ficariam coladas ("e-mailverificado") e o navegador quebraria no hífen. `.crud-tabela__rotulo-
  // controlado` (nowrap) impede a quebra espontânea antes do breakpoint; o <br> explícito continua valendo.
  const classesCabecalho = (coluna: Coluna<T>) =>
    TIPOS_COLUNA[coluna.tipo].classe + (coluna.quebrarRotulo ? ' crud-tabela__rotulo-controlado' : '');

  const rotuloColuna = (coluna: Coluna<T>): ReactNode => {
    const ultimoEspaco = coluna.rotulo.lastIndexOf(' ');
    if (!coluna.quebrarRotulo || ultimoEspaco === -1) {
      return coluna.rotulo;
    }
    return (
      <>
        {coluna.rotulo.slice(0, ultimoEspaco + 1)}
        <br className="crud-tabela__quebra-rotulo" />
        {coluna.rotulo.slice(ultimoEspaco + 1)}
      </>
    );
  };

  // Nome e texto: piso pelo maior valor da lista INTEIRA (não só a página visível), para a coluna não mudar ao
  // virar a página, limitado por `--coluna-piso-maximo` (abaixo disso quebram a linha).
  const pisos = useMemo(() => {
    const resultado: Partial<Record<string, string>> = {};
    colunas.forEach((coluna) => {
      if (TIPOS_COLUNA[coluna.tipo].largura === 'conteudo') {
        const piso = `min(${maiorTexto(coluna, linhas) + 2}ch, var(--coluna-piso-maximo))`;
        // Coluna de texto do meio soma o respiro (ver ajustarRespiro), para o respiro não apertar o texto.
        resultado[coluna.chave] =
          coluna.tipo === 'texto' ? `calc(${piso} + 2 * var(--respiro-efetivo, 0px))` : piso;
      }
    });
    return resultado;
  }, [linhas, colunas]);

  // Colunas curtas, nome e texto: o texto de TODAS as linhas (não só da página visível), medido em pixels no
  // efeito abaixo (largura das curtas, quanto o nome sobra e se alguma coluna de texto quebra a linha).
  const textosMedidos = useMemo(() => {
    const resultado: Partial<Record<string, string[]>> = {};
    colunas.forEach((coluna) => {
      const tipo = TIPOS_COLUNA[coluna.tipo];
      if (tipo.largura === 'curta' || coluna.tipo === 'nome' || coluna.tipo === 'texto') {
        resultado[coluna.chave] = linhas.map((linha) => tipo.texto(linha[coluna.chave]));
      }
    });
    return resultado;
  }, [linhas, colunas]);

  const estiloColuna = (coluna: Coluna<T>) => {
    const piso = pisos[coluna.chave];
    return piso ? { minWidth: piso } : undefined;
  };

  // Rolagem lateral (tabela maior que o cartão): id, nome e Ações ficam presos (position: sticky, 5-crud.css).
  // O nome precisa saber a largura real da coluna id para grudar logo depois dela; os atributos
  // `data-rola-esquerda`/`data-rola-direita` ligam a linha que separa a parte presa da que está rolando, só
  // quando há algo escondido daquele lado. `useLayoutEffect`: mede antes de a tela ser pintada, para as colunas
  // curtas não nascerem com uma largura e mudarem no quadro seguinte.
  const wrapperRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }
    // Largura das colunas curtas medida em pixels de verdade (uma estimativa por número de letras sobrava ~20% e
    // empurrava a tabela para a rolagem): o maior entre o cabeçalho, as células visíveis (inclui o badge
    // Sim/Não) e o texto de todas as linhas da lista, na fonte da célula. As do mesmo tipo na mesma tabela ficam
    // com a mesma largura (as 4 Sim/Não de Tipos de Link, meta e arrecadado em Campanhas). Mede o CONTEÚDO, não a
    // célula, então aplicar o resultado não muda a próxima medição.
    const medirCurtas = () => {
      const larguraConteudo = (elemento: Element): number => {
        const intervalo = document.createRange();
        intervalo.selectNodeContents(elemento);
        return intervalo.getBoundingClientRect().width;
      };
      const contexto = document.createElement('canvas').getContext('2d');
      const grupos = new Map<string, { cabecalhos: HTMLTableCellElement[]; largura: number }>();
      wrapper.querySelectorAll<HTMLTableCellElement>('thead th[data-tipo-curta]').forEach((th) => {
        let maior = larguraConteudo(th);
        const celulas = wrapper.querySelectorAll(`tbody tr td:nth-child(${th.cellIndex + 1})`);
        celulas.forEach((td) => {
          maior = Math.max(maior, larguraConteudo(td));
        });
        const primeira = celulas.item(0) as Element | null;
        if (contexto && primeira) {
          contexto.font = getComputedStyle(primeira).font;
          (textosMedidos[th.dataset.chave ?? ''] ?? []).forEach((texto) => {
            maior = Math.max(maior, contexto.measureText(texto).width);
          });
        }
        const estilo = getComputedStyle(th);
        maior += parseFloat(estilo.paddingLeft) + parseFloat(estilo.paddingRight);
        const chaveGrupo = th.dataset.tipoCurta ?? '';
        const grupo = grupos.get(chaveGrupo) ?? { cabecalhos: [], largura: 0 };
        grupo.cabecalhos.push(th);
        grupo.largura = Math.max(grupo.largura, maior);
        grupos.set(chaveGrupo, grupo);
      });
      grupos.forEach(({ cabecalhos, largura }) => {
        cabecalhos.forEach((th) => {
          th.style.minWidth = `calc(${Math.ceil(largura)}px + 2 * var(--respiro-efetivo, 0px))`;
        });
      });
    };
    // Texto das ações (Alterar/Consultar/Excluir): além da regra de largura da seção (5-crud.css), some quando
    // ESTA tabela não cabe com ele, e volta quando o cartão tiver de novo a largura que ela pedia com o texto.
    let larguraComTextoAcoes = 0;
    const ajustarTextoAcoes = () => {
      if (!wrapper.hasAttribute('data-acoes-icone')) {
        if (wrapper.scrollWidth > wrapper.clientWidth) {
          larguraComTextoAcoes = wrapper.scrollWidth;
          wrapper.setAttribute('data-acoes-icone', '');
        }
      } else if (wrapper.clientWidth >= larguraComTextoAcoes) {
        wrapper.removeAttribute('data-acoes-icone');
      }
    };
    // Respiro das colunas do meio (texto e curta): o NOME fica com a sobra da tabela (distribuição "direita"),
    // então sobra = largura que o nome ganhou além do que o texto dele pede (maior nome da lista, até o teto
    // da coluna). Metade de cada lado de cada coluna do meio vira `--respiro-dados`, que o CSS limita a
    // `--respiro-dados-maximo`. Sem sobra, respiro zero: as colunas só ficam coladas quando falta espaço.
    const ajustarRespiro = () => {
      const cabecalhoNome = wrapper.querySelector<HTMLTableCellElement>('thead th.crud-tabela__col--nome');
      const blocoNome = wrapper.querySelector('tbody .crud-tabela__nome');
      const colunasMeio = wrapper.querySelectorAll('thead th.crud-tabela__col--texto, thead th.crud-tabela__col--curta');
      const contexto = document.createElement('canvas').getContext('2d');
      if (!cabecalhoNome || !blocoNome || colunasMeio.length === 0 || !contexto) {
        return;
      }
      const estiloBloco = getComputedStyle(blocoNome);
      contexto.font = estiloBloco.font;
      let natural = parseFloat(estiloBloco.minWidth) || 0;
      (textosMedidos[cabecalhoNome.dataset.chave ?? ''] ?? []).forEach((texto) => {
        natural = Math.max(natural, contexto.measureText(texto).width);
      });
      const teto = parseFloat(estiloBloco.maxWidth);
      if (Number.isFinite(teto)) {
        natural = Math.min(natural, teto);
      }
      // Coluna de texto quebrando a linha (limite menor em seção estreita): a folga vai para ela, não para respiro.
      const textoQuebra = [...wrapper.querySelectorAll<HTMLTableCellElement>('thead th.crud-tabela__col--texto')].some(
        (th) => {
          const celula = wrapper.querySelector(`tbody tr td:nth-child(${th.cellIndex + 1})`);
          if (!celula) {
            return false;
          }
          const estilo = getComputedStyle(celula);
          contexto.font = estilo.font;
          const disponivel =
            th.getBoundingClientRect().width - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
          return (textosMedidos[th.dataset.chave ?? ''] ?? []).some(
            (texto) => contexto.measureText(texto).width > disponivel + 0.5,
          );
        },
      );
      if (textoQuebra) {
        return;
      }
      contexto.font = estiloBloco.font;
      const estiloCabecalho = getComputedStyle(cabecalhoNome);
      natural += parseFloat(estiloCabecalho.paddingLeft) + parseFloat(estiloCabecalho.paddingRight);
      // O nome não encolhe abaixo do próprio piso (estimado por letras em pisos, acima), mesmo que o texto medido caiba.
      natural = Math.max(natural, parseFloat(estiloCabecalho.minWidth) || 0);
      const sobra = cabecalhoNome.getBoundingClientRect().width - natural;
      if (sobra <= 0) {
        return;
      }
      const lados = colunasMeio.length * 2;
      const primeiraDoMeio = colunasMeio[0] as HTMLElement;
      const paddingSemRespiro = parseFloat(getComputedStyle(primeiraDoMeio).paddingLeft);
      wrapper.style.setProperty('--respiro-dados', `${sobra / lados}px`);
      // A conta acima é estimativa (o piso do nome vem de letras, não de pixels): se o respiro empurrou a tabela
      // para fora do cartão, devolve exatamente o que passou (a partir do respiro que valeu, já com o teto do CSS).
      const excesso = wrapper.scrollWidth - wrapper.clientWidth;
      if (excesso > 0) {
        const respiroAplicado = parseFloat(getComputedStyle(primeiraDoMeio).paddingLeft) - paddingSemRespiro;
        wrapper.style.setProperty('--respiro-dados', `${Math.max(0, respiroAplicado - (excesso + 1) / lados)}px`);
      }
    };
    const atualizarRolagem = () => {
      wrapper.toggleAttribute('data-rola-esquerda', wrapper.scrollLeft > 0);
      wrapper.toggleAttribute(
        'data-rola-direita',
        wrapper.scrollLeft + wrapper.clientWidth < wrapper.scrollWidth - 1,
      );
    };
    // Tudo medido com respiro zero, para o respiro não entrar na própria conta; as curtas somam o respiro no CSS
    // (min-width acima), e as do mesmo tipo continuam iguais.
    const atualizar = () => {
      wrapper.style.setProperty('--respiro-dados', '0px');
      medirCurtas();
      ajustarTextoAcoes();
      ajustarRespiro();
      const colunaId = wrapper.querySelector('th.crud-tabela__col--id');
      const deslocamento = colunaId ? colunaId.getBoundingClientRect().width : 0;
      wrapper.style.setProperty('--deslocamento-nome', `${deslocamento}px`);
      atualizarRolagem();
    };
    atualizar();
    const observador = new ResizeObserver(atualizar);
    observador.observe(wrapper);
    const tabela = wrapper.querySelector('table');
    if (tabela) {
      observador.observe(tabela);
    }
    wrapper.addEventListener('scroll', atualizarRolagem, { passive: true });
    return () => {
      observador.disconnect();
      wrapper.removeEventListener('scroll', atualizarRolagem);
    };
  }, [carregando, textosMedidos]);

  const { totalPaginas, paginaAtual, itensPagina: linhasPagina } = paginarClientSide(linhasOrdenadas, pagina, tamanhoPagina);

  // Altura da linha vazia que completa a última página, medida numa linha de verdade (pílula e botões de ação deixam
  // a linha mais alta que uma linha só de texto). As bordas mudam meio pixel por linha: a 1ª linha encosta na linha
  // grossa do cabeçalho (fica mais alta) e a última não tem borda embaixo (fica mais baixa). Por isso o modelo é uma
  // linha do meio; com um registro só, desconta da 1ª a diferença da borda do cabeçalho; e a última vazia desconta a
  // borda que não tem.
  const corpoRef = useRef<HTMLTableSectionElement>(null);
  const [linhaVazia, setLinhaVazia] = useState<{ altura: number; borda: number } | null>(null);
  useLayoutEffect(() => {
    const corpo = corpoRef.current;
    const reais = [...(corpo?.querySelectorAll('tr:not(.crud-tabela__linha-vazia)') ?? [])];
    const primeira = reais.at(0);
    if (!corpo || !primeira) return;
    // A linha fina entre as linhas mora na própria linha (tr), não na célula (5-crud.css).
    const borda = parseFloat(getComputedStyle(primeira).borderBottomWidth) || 0;
    const cabecalho = corpo.parentElement?.querySelector('thead th');
    const bordaCabecalho = cabecalho ? parseFloat(getComputedStyle(cabecalho).borderBottomWidth) || 0 : borda;
    const altura =
      reais.length >= 2
        ? reais[1].getBoundingClientRect().height
        : primeira.getBoundingClientRect().height - (bordaCabecalho - borda) / 2;
    // Só grava se a medida mudou: `linhasPagina` é um array novo a cada desenho, e gravar sempre um objeto novo
    // redesenhava a tabela sem parar.
    setLinhaVazia((atual) => (atual?.altura === altura && atual.borda === borda ? atual : { altura, borda }));
  }, [linhasPagina]);
  const quantasVazias = totalPaginas > 1 && tamanhoPagina !== 'todos' ? Math.max(0, tamanhoPagina - linhasPagina.length) : 0;

  const aoClicarColuna = (chave: keyof T & string) => {
    const novaDirecao = ordenacao.chave === chave && ordenacao.direcao === 'asc' ? 'desc' : 'asc';
    // Senão a pessoa pode ficar "presa" na página 3 depois de reordenar,
    // vendo um pedaço que não corresponde mais ao topo da lista nova.
    // `dir: null` quando volta pro padrão 'asc' - mantém a URL limpa.
    atualizarParametros({ ordenar: chave, dir: novaDirecao === 'asc' ? null : 'desc', pagina: null });
  };

  return (
    <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <div>
          <div className="flex items-center gap-2">
            {nivelTitulo === 1 ? (
              <h1 className="titulo-secao">{titulo}</h1>
            ) : (
              <h2 className="titulo-secao">{titulo}</h2>
            )}
            {ajuda && <Tooltip texto={ajuda} baixo />}
          </div>
        </div>
        {acaoTopo && <div className="crud-secao__acao-topo">{acaoTopo}</div>}
      </div>

      {/* Busca sempre visível, inclusive enquanto carrega: se ela aparecesse só depois (ou só em lista com mais
          de 5 linhas), a tabela nasceria mais alta e pularia para baixo quando os dados chegassem, e cada tela
          começaria a tabela numa altura diferente. Os filtros de lista entram na mesma linha quando os dados
          chegam, sem mudar a altura. */}
      <BarraFiltros
        mostrarBusca
        valorBusca={filtro}
        aoMudarBusca={(valor) => atualizarParametros({ q: valor, pagina: null })}
        aoLimparTudo={() =>
          atualizarParametros({
            q: null,
            pagina: null,
            ...Object.fromEntries((filtrosFacetados ?? []).map((faceta) => [faceta.chave, null])),
          })
        }
        facetas={(filtrosFacetados ?? []).map((faceta) => ({
          chave: faceta.chave,
          rotulo: faceta.rotulo,
          opcoes: opcoesPorFaceta[faceta.chave] ?? [],
          selecionados: selecoesPorFaceta[faceta.chave] ?? [],
          rotulos: faceta.rotulos,
          aoAlternar: (opcao) => {
            const selecionados = selecoesPorFaceta[faceta.chave] ?? [];
            const novoValor = selecionados.includes(opcao)
              ? selecionados.filter((valor) => valor !== opcao)
              : [...selecionados, opcao];
            atualizarParametros({
              [faceta.chave]: novoValor.length > 0 ? novoValor.join(',') : null,
              pagina: null,
            });
          },
          aoLimpar: () => atualizarParametros({ [faceta.chave]: null, pagina: null }),
        }))}
      />

      {carregando ? (
        // Esqueleto (mesmas colunas) em vez de "Carregando...": a tela não "pula" quando os dados chegam.
        <div className="crud-tabela__wrapper">
          <table className="crud-tabela" data-distribuicao={DISTRIBUICAO_COLUNAS}>
            <thead>
              <tr>
                {colunas.map((coluna) => (
                  <th key={coluna.chave} className={classesCabecalho(coluna)} style={estiloColuna(coluna)}>
                    {rotuloColuna(coluna)}
                  </th>
                ))}
                {temAcoes && <CabecalhoAcoes />}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((indice) => (
                <tr key={indice} className="animate-pulse">
                  {colunas.map((coluna) => (
                    <td key={coluna.chave}>
                      <div className="h-3.5 fundo-sutil rounded"></div>
                    </td>
                  ))}
                  {temAcoes && (
                    <td>
                      <div className="h-3.5 fundo-sutil rounded"></div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="crud-tabela__wrapper" ref={wrapperRef}>
            <table className="crud-tabela" data-distribuicao={DISTRIBUICAO_COLUNAS}>
              <thead>
                <tr>
                  {colunas.map((coluna) => (
                    <th
                      key={coluna.chave}
                      className={'crud-tabela__ordenavel ' + classesCabecalho(coluna)}
                      style={estiloColuna(coluna)}
                      data-chave={coluna.chave}
                      data-tipo-curta={TIPOS_COLUNA[coluna.tipo].largura === 'curta' ? coluna.tipo : undefined}
                      onClick={() => aoClicarColuna(coluna.chave)}
                    >
                      {rotuloColuna(coluna)}
                      {ordenacao.chave === coluna.chave && (ordenacao.direcao === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                  ))}
                  {temAcoes && <CabecalhoAcoes />}
                </tr>
              </thead>
              <tbody ref={corpoRef}>
                {linhasPagina.map((linha) => (
                  <tr key={String(linha[chavePrimaria])}>
                    {colunas.map((coluna) => {
                      const tipo = TIPOS_COLUNA[coluna.tipo];
                      return (
                        <td key={coluna.chave} className={tipo.classe} style={estiloColuna(coluna)}>
                          {coluna.renderizar ? (
                            coluna.renderizar(linha)
                          ) : coluna.umaLinha ? (
                            <span className={coluna.tipo === 'nome' ? 'crud-tabela__nome' : undefined}>
                              <TextoResumido texto={tipo.texto(linha[coluna.chave]) || null} />
                            </span>
                          ) : (
                            tipo.exibir(linha[coluna.chave])
                          )}
                        </td>
                      );
                    })}
                    {acoes && temAcoes && <CelulaAcoes acoes={acoes} linha={linha} indisponivel={acaoIndisponivel} />}
                  </tr>
                ))}
                {/* Última página incompleta: linhas vazias até o tamanho escolhido, para a tabela não encolher. */}
                {Array.from({ length: quantasVazias }, (_, indice) => (
                  <tr
                    key={`vazia-${indice}`}
                    className="crud-tabela__linha-vazia"
                    aria-hidden="true"
                    style={{
                      height: linhaVazia
                        ? indice === quantasVazias - 1
                          ? linhaVazia.altura - linhaVazia.borda / 2
                          : linhaVazia.altura
                        : undefined,
                    }}
                  >
                    <td colSpan={colunas.length + (temAcoes ? 1 : 0)}>&nbsp;</td>
                  </tr>
                ))}
                {linhasPagina.length === 0 && !erro && (
                  <tr>
                    <td colSpan={colunas.length + (temAcoes ? 1 : 0)}>
                      <EstadoVazio {...(filtro || algumaFacetaAtiva ? VAZIO_FILTRO : (vazio ?? VAZIO_PADRAO))} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <RodapePaginacao
            total={linhasOrdenadas.length}
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            tamanhoPagina={tamanhoPagina}
            aoMudarPagina={(alvo) => atualizarParametros({ pagina: alvo === 1 ? null : alvo })}
            aoMudarTamanho={(tamanho) =>
              atualizarParametros({
                tamanho: tamanho === TAMANHOS_PAGINA[0] ? null : String(tamanho),
                pagina: null,
              })
            }
          />
        </>
      )}

      <MensagemErro texto={erro} className="crud-erro" />
    </section>
  );
}
