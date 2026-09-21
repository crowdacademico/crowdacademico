import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { AcaoLinha } from './acao-linha';
import { BadgeBooleano } from './badge-booleano';
import { BarraFiltros } from '../search/barra-filtros';
import { useErroToast } from '../layout/toast/use-erro-toast';
import { textoSeguro } from '../../services/constant/utils/formatacao.util';
import { paginarClientSide } from '../../services/constant/utils/paginacao.util';
import { RodapePaginacao } from '../pagination/rodape-paginacao';
import { TAMANHOS_PAGINA } from '../pagination/tamanhos-pagina.constants';
import { LIMIAR_FILTRO } from '../search/limiar-filtro.constants';

// `object`, não `Record<string, unknown>` (achado na Fase 6, primeiro uso
// real do genérico): toda linha real é uma interface nomeada espelhando
// um DTO do Nest (UsuarioResponse, etc.) - interface sem assinatura de
// índice própria não satisfaz `Record<string, unknown>` como argumento de
// tipo genérico (TS exige a assinatura de índice no tipo NOMEADO, só
// literal solto ganha a folga estrutural) mesmo sendo perfeitamente
// indexável via `keyof T`, que é tudo que este arquivo realmente precisa.
type Linha = object;

interface Coluna<T extends Linha> {
  chave: keyof T & string;
  rotulo: string;
  centralizar?: boolean;
  largura?: string;
  quebrarRotulo?: boolean;
  renderizar?: (linha: T) => ReactNode;
}

interface ColunaExtra<T extends Linha> {
  rotulo: string;
  renderizar: (linha: T) => ReactNode;
}

interface FiltroFacetado<T extends Linha> {
  chave: keyof T & string;
  rotulo: string;
  ordem?: string[];
  // `rotulos` (13-09-2026, pedido do Lucas: facet de Tipo em Termos de Uso)
  // - opcional, traduz o valor CRU pra um texto amigável só na exibição do
  // dropdown (botão + opções); o filtro em si continua comparando/gravando
  // na URL o valor cru (`atualizarParametros`), nunca o traduzido - mesmo
  // espírito de permissao-nomes-amigaveis.ts, camada de exibição por cima
  // do dado, sem mudar o dado.
  rotulos?: Record<string, string>;
}

type AcaoPadrao = 'alterar' | 'consultar' | 'excluir';

interface GenericTableProps<T extends Linha> {
  titulo: string;
  acaoTopo?: ReactNode;
  colunas: Coluna<T>[];
  chavePrimaria: keyof T & string;
  listar: () => Promise<T[]>;
  // `acoes` (14-09-2026, revisão do Lucas - substitui o par antigo
  // `acoes: AcaoPadrao[]` + `aoAlterar`/`aoConsultar`/`aoExcluir` separados)
  // - "quais ações aparecem" e "quem trata cada ação" eram 2 fontes de
  // verdade independentes que podiam discordar em silêncio (Campanha e
  // Papel ficaram com um ícone sem handler, que caía num `<Link
  // to="undefined/id/ação">` quebrado em runtime, sem erro de tipo nem de
  // lint). Com o handler DENTRO da própria chave, ação exibida sem handler
  // vira estado ilegal irrepresentável em vez de bug de runtime - a lista
  // de botões é só `Object.keys(acoes)` filtrado pela ordem fixa abaixo.
  acoes?: Partial<Record<AcaoPadrao, (linha: T) => void>>;
  colunaExtra?: ColunaExtra<T>;
  filtrosFacetados?: FiltroFacetado<T>[];
}

// Valor booleano vira badge colorido (Sim/Não), não o texto cru "true"/
// "false" - muito mais legível numa lista (achado de uma IA, rodando
// o painel de verdade: "E-MAIL VERIFICADO: false" não é instantâneo de
// ler, um badge é). Reaproveita `BadgeBooleano` (14-09-2026) em vez de
// remontar a mesma classe na mão - era a única duplicação real dele.
function celulaValor(valor: unknown): ReactNode {
  if (typeof valor === 'boolean') {
    return <BadgeBooleano valor={valor} />;
  }
  return textoSeguro(valor);
}

// Tabela genérica de LISTAGEM (leitura, filtro, ordenação, paginação) usada
// pelo painel admin - cada módulo novo do Nest com listagem simples vira só
// uma entrada de colunas aqui, não uma tela nova escrita do zero.
//
// Criar/Alterar/Excluir NÃO acontecem embutidos nesta tabela - abrem modal
// no componente pai via `acoes` (ver comentário da prop, acima). Sem
// `acoes` (catálogos só-leitura como Permissões), não aparece coluna de
// Ações nenhuma.
//
// O botão "Ver log" + painel de auditoria NÃO moram mais aqui (13-09-2026,
// achado do Lucas: "log de auditoria não é estrutura de tabela" -
// virou `BlocoLogAuditoria`, componente irmão colocado pelas 8 telas que
// precisam logo abaixo do `<GenericTable>`, não mais uma prop daqui).
//
// TESTE PRA QUALQUER PROP NOVA que alguém for tentado a adicionar aqui
// (método do Lucas, vale mais que a regra em abstrato): uma prop
// pertence a ESTE componente se uma tela que não é "do tipo dele" (uma
// tela sem tabela nenhuma) conseguiria viver sem ela. `colunaExtra`/
// `filtrosFacetados` passam nesse teste - são configuração de TABELA.
// `buscarLog` não passava (achado acima) - é outra funcionalidade
// (dados/paginação/visual próprios) que só por acaso costumava aparecer
// embaixo de uma tabela. "Quantas telas já usam a prop" NÃO é o teste -
// era usada por 8 das 10 telas e ainda assim não pertencia aqui.
//
// SEGUNDO TESTE, complementar (14-09-2026, revisão do Lucas - o
// teste acima só decide ENTRADA, não decide SAÍDA): se uma tela que NÃO
// PODE usar este componente ainda assim precisa de algo que hoje mora
// aqui dentro, isto é um IRMÃO, não um miolo - foi esse critério que fez
// o `BlocoLogAuditoria` nascer, e é o mesmo que tirou o rodapé de
// paginação e a barra de filtros de dentro daqui (ver
// `components/pagination/rodape-paginacao.tsx` e
// `components/search/barra-filtros.tsx`) - as bancadas do Campo de Testes
// (risco de linha impede usar a tabela) precisavam dos dois mesmo assim.

export function GenericTable<T extends Linha>({
  titulo,
  acaoTopo,
  colunas,
  chavePrimaria,
  listar,
  acoes,
  // Coluna adicional genérica (09-08-2026, Bloco F: botão "ⓘ" que abre um
  // modal de detalhe por linha, na tabela Permissões) - `{ rotulo,
  // renderizar(linha) }`. Existe separada de `colunas` (que só espera
  // valor de dado bruto) porque esta pode renderizar QUALQUER coisa
  // (botão, ícone, badge composto), não só `String(valor)`. Independe de
  // `acoes` - tabelas só-leitura (sem Ações) também podem usar.
  colunaExtra,
  // Filtros por faceta (09-08-2026, pedido do Lucas: filtro de papel na
  // tabela Usuários; generalizado no mesmo dia pra virar lista - tabela
  // Permissões pediu 2 lado a lado, papel e impacto) - array de `{ chave,
  // rotulo, ordem? }`. Genérico: funciona pra QUALQUER coluna com valores
  // discretos, não só "papel"/"impacto" - as opções de cada dropdown são
  // derivadas sozinhas a partir dos valores que já aparecem em
  // `linha[chave]` (célula com vários valores separada por ", ", mesma
  // convenção já usada pela coluna "papel" de ListarUsuarios; célula de
  // valor único também funciona, vira uma lista de 1 token). Cada faceta é
  // independente (marcar em uma não mexe nas outras) e se combinam com E
  // entre si (dentro da mesma faceta é OU) - padrão de cada uma é "Todos"
  // (nenhuma opção marcada = sem filtro nenhum, mostra tudo). `ordem`
  // (opcional, por faceta) - lista com a ordem exata desejada (ex.: papel
  // do menor pro maior poder); sem isso, cai no alfabético (pt-BR). Valor
  // que aparecer nos dados mas não estiver em `ordem` vai pro final da
  // lista, não desaparece.
  filtrosFacetados,
}: GenericTableProps<T>) {
  // Handlers extraídos pra const (não `acoes.alterar!(linha)` dentro do
  // `onClick`, mais abaixo) - `acoes?.alterar &&` só estreita o tipo dentro
  // da MESMA expressão; dentro de uma closure nova (o `onClick`), o
  // TypeScript não carrega essa narrowing pra dentro, e `!` (non-null
  // assertion) é banido no projeto (eslint). Uma const captura a
  // narrowing sem precisar de `!` - mesmo valor pra toda linha da tabela,
  // por isso vive aqui fora do `.map`, não dentro dele.
  const aoAlterarLinha = acoes?.alterar;
  const aoConsultarLinha = acoes?.consultar;
  const aoExcluirLinha = acoes?.excluir;
  // A coluna Ações existe se pelo menos 1 handler foi passado em `acoes`.
  const temAcoes = Boolean(aoAlterarLinha || aoConsultarLinha || aoExcluirLinha);
  const [linhas, setLinhas] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro, limparErro } = useErroToast();
  // Filtro/página/ordenação/faceta vivem na URL (query string), não em
  // useState local (22-08-2026, pedido do Lucas: uma navegação que
  // desmontasse a página de listagem resetava o filtro escolhido, e
  // useState não sobrevive a isso). `{ replace: true }` em toda escrita:
  // cada clique em filtro/página/ordenação SUBSTITUI a entrada atual do
  // histórico em vez de empilhar uma nova.
  // Nomes reservados na URL: q, pagina, tamanho, ordenar, dir - evitar
  // faceta com uma dessas `chave` (nenhuma das existentes hoje usa).
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
  useEffect(() => {
    // Padrão comum de "buscar dado ao montar/quando a query mudar" (mesmo
    // exemplo dos docs do React) - a regra nova react-hooks/set-state-in-effect
    // marca a chamada de setCarregando/setErro como suspeita mesmo assim.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    limparErro();
    listar()
      .then(setLinhas)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listar]);

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

    // Facetas primeiro (nenhuma marcada em cada uma = "Todos", sem filtro
    // nenhum - o padrão pedido pelo Lucas), texto depois. Entre facetas
    // DIFERENTES é E (uma linha só sobrevive se bater em TODAS as que têm
    // seleção); dentro da MESMA faceta é OU (basta bater em uma das
    // opções marcadas).
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

    const termo = filtro.trim().toLowerCase();
    if (!termo) {
      return base;
    }
    return base.filter((linha) =>
      colunas.some((coluna) => String(linha[coluna.chave] ?? '').toLowerCase().includes(termo)),
    );
  }, [linhas, filtro, colunas, filtrosFacetados, selecoesPorFaceta]);

  // Ordena a lista FILTRADA inteira, antes de paginar - nunca a página
  // atual sozinha. Ordenar só a fatia visível é o jeito clássico desse tipo
  // de recurso "bugar com paginação" (linha some da vista ao virar página,
  // ordem parece errada entre páginas). Tipo da coluna vem do próprio dado
  // (typeof do primeiro valor não-nulo achado), não de uma config nova por
  // coluna - funciona pra number (id), string (nome/email) e boolean
  // (email verificado) sem precisar declarar isso em cada tela que usa
  // GenericTable.
  const linhasOrdenadas = useMemo(() => {
    // `ordenacao.chave` vem da URL (searchParams.get('ordenar')) - um
    // `string | null` cru, sem garantia estática de bater com uma chave
    // real de `T` (a Fase 6 trocou a restrição de linha de `Record<string,
    // unknown>` pra `object`, já que toda linha real é uma interface
    // nomeada sem assinatura de índice - ver comentário em `type Linha`
    // acima). Confirmar contra `colunas` (cujo `chave` já É `keyof T &
    // string`) prova o tipo pro compilador SEM `as` - e como bônus, uma
    // URL obsoleta apontando pra uma coluna que não existe mais some
    // (mesmo efeito de "sem ordenação"), em vez de indexar um valor
    // qualquer. Nenhum fluxo real do app muda: `aoClicarColuna` sempre
    // manda um `coluna.chave` de verdade.
    const colunaOrdenada = colunas.find((coluna) => coluna.chave === ordenacao.chave);
    if (!colunaOrdenada) {
      return linhasFiltradas;
    }
    const chaveOrdenacao = colunaOrdenada.chave;
    const linhaComValor = linhas.find(
      (linha) => linha[chaveOrdenacao] !== null && linha[chaveOrdenacao] !== undefined,
    );
    const tipo = typeof linhaComValor?.[chaveOrdenacao];
    const sinal = ordenacao.direcao === 'asc' ? 1 : -1;

    return [...linhasFiltradas].sort((a, b) => {
      const valorA = a[chaveOrdenacao];
      const valorB = b[chaveOrdenacao];
      if (tipo === 'number') {
        // Number(...) em vez de comparar direto: `valorA`/`valorB` são
        // `unknown` aqui (o sniff de tipo acima olhou uma linha diferente,
        // não estes dois valores) - Number(...) é exatamente a coerção que
        // o operador `-` já fazia implicitamente em JS puro, então o
        // resultado é idêntico ao de antes.
        return (Number(valorA) - Number(valorB)) * sinal;
      }
      if (tipo === 'boolean') {
        return (valorA === valorB ? 0 : valorA ? 1 : -1) * sinal;
      }
      return String(valorA ?? '').localeCompare(String(valorB ?? ''), 'pt-BR') * sinal;
    });
  }, [linhasFiltradas, linhas, ordenacao, colunas]);

  // Colunas de valor curto (número ou booleano) ficam centralizadas,
  // cabeçalho e célula - pedido da Alexia (18-08-2026: "centralizar o
  // negócio de sim e não" + "melhorar espaçamento entre colunas", as
  // duas juntas porque são a mesma causa: texto curto colado à esquerda
  // deixa um vão grande e desigual à direita, sobretudo ao lado de uma
  // coluna de texto longo como "nome"/"descrição"). Mesmo truque de
  // sniffar o tipo pelo primeiro valor não-nulo que `linhasOrdenadas` já
  // usa pra ordenação, então não precisa de config nova por coluna nas
  // ~10 telas que já usam GenericTable.
  //
  // `coluna.centralizar` (19-08-2026, mesmo pedido, rodada 2) - escape
  // manual pra quando o sniff automático não serve: a coluna "descrição"
  // de Permissões guarda um resumo em TEXTO (sniff acharia 'string', não
  // centralizaria por padrão), mas o que aparece na tela é um botão
  // "Saiba mais" (`renderizar`) - curto, e olhando esquisito colado à
  // esquerda igual os outros. `|| coluna.centralizar` é aditivo: nunca
  // tira a centralização automática que já funcionava, só liga em mais
  // um caso.
  const colunasCentralizadas = useMemo(() => {
    const chaves = new Set<string>();
    colunas.forEach((coluna) => {
      const linhaComValor = linhas.find(
        (linha) => linha[coluna.chave] !== null && linha[coluna.chave] !== undefined,
      );
      const tipo = typeof linhaComValor?.[coluna.chave];
      if (tipo === 'number' || tipo === 'boolean' || coluna.centralizar) {
        chaves.add(coluna.chave);
      }
    });
    return chaves;
  }, [linhas, colunas]);

  // Coluna "id" com largura padrão em TODA tabela (19-08-2026, pedido do
  // Lucas: "é uma coluna pequena, e deve suportar até 3 ou 4 dígitos sem
  // quebra de linha... tabelas independentes, começando a alinhar a
  // largura das colunas"). `rotulo` (não `chave`) é o que identifica -
  // toda tela já escreve `{ chave: 'idAlgumaCoisa', rotulo: 'id' }`
  // (mesmo texto literal em todas, minúsculo), então isto pega a coluna
  // certa em qualquer tabela sem precisar de config nova por tela, igual
  // `colunasCentralizadas` acima. Sem isso, a largura da coluna id
  // dependia de quantos dígitos o PRIMEIRO registro carregado tinha
  // (table-layout: auto) - uma tabela com id até 99 ficava mais estreita
  // que uma com id até 9999, mesma coluna, tabelas diferentes.
  const colunaIdChave = useMemo(
    () => colunas.find((coluna) => coluna.rotulo.toLowerCase() === 'id')?.chave,
    [colunas],
  );

  // Junta as duas classes opcionais acima - usado tanto no <th> quanto no
  // <td> de cada coluna, pra não repetir a mesma composição duas vezes.
  const classesColuna = (coluna: Coluna<T>) =>
    (colunasCentralizadas.has(coluna.chave) ? ' crud-tabela__celula--centralizada' : '') +
    (coluna.chave === colunaIdChave ? ' crud-tabela__coluna-id' : '');

  // `coluna.quebrarRotulo` (25-08-2026, pedido do Lucas: "e-mail
  // verificado" oscilando entre quebrado/inteiro várias vezes conforme a
  // tela diminui - "e-mail verificado" quebra pelo espaço realmente
  // sobrando pra coluna, mas esse espaço pula toda vez que outra coisa
  // muda por perto (Ações vira ícone, sidebar some), cruzando o limite
  // de novo pra cada lado). Em vez de depender do espaço sobrando (o
  // `white-space` padrão do navegador já quebra sozinho quando aperta,
  // mas de forma instável), insere uma quebra MANUAL entre a última
  // palavra e o resto - escondida por padrão (`display:none` em
  // `.crud-tabela__quebra-rotulo`, ver 5-crud.css) e só "ligada" abaixo
  // de UM breakpoint fixo de JANELA (não de espaço sobrando, de
  // propósito - janela só encolhe numa direção, nunca pula igual o
  // espaço da coluna pula) - muda de estado uma vez só, sempre no mesmo
  // lugar, nunca oscila. Só entra em jogo quando a tela marca
  // `coluna.quebrarRotulo: true` (opt-in, como `centralizar`/`largura`
  // acima) - nenhuma outra coluna muda de comportamento.
  // `slice(0, ultimoEspaco + 1)` (CORRIGIDO - era `ultimoEspaco`, sem o
  // "+1") - precisa manter o próprio caractere de espaço na primeira
  // metade. Sem ele, com o <br> escondido (`display:none`, o caso comum,
  // tela larga) as duas metades ficavam coladas sem espaço nenhum entre
  // si ("e-mailverificado") - e pior, sem NENHUM espaço sobrando pro
  // navegador quebrar sozinho quando a coluna ficava apertada, ele usava
  // o único ponto de quebra que sobrava (o hífen de "e-mail"), quebrando
  // errado ("e-" / "mailverificado") numa largura que não tinha nada a
  // ver com o breakpoint escolhido aqui.
  // Classe extra só pro <th> (não pro <td> - `classesColuna` é
  // compartilhada pelos dois, mas `quebrarRotulo` é uma decisão só do
  // CABEÇALHO). `.crud-tabela__rotulo-controlado` trava `white-space:
  // nowrap` (ver 5-crud.css) - sem isso, o navegador ainda podia quebrar
  // sozinho no espaço (agora corrigido, ver comentário de rotuloColuna)
  // antes do breakpoint escolhido, reproduzindo a mesma oscilação de
  // antes, só que "certa" em vez de errada no hífen. `white-space:
  // nowrap` não impede o `<br>` explícito de funcionar quando ativo -
  // só impede quebra ESPONTÂNEA no espaço; são coisas diferentes em CSS.
  const classesCabecalho = (coluna: Coluna<T>) =>
    classesColuna(coluna) + (coluna.quebrarRotulo ? ' crud-tabela__rotulo-controlado' : '');

  const rotuloColuna = (coluna: Coluna<T>): ReactNode => {
    if (!coluna.quebrarRotulo) {
      return coluna.rotulo;
    }
    const ultimoEspaco = coluna.rotulo.lastIndexOf(' ');
    if (ultimoEspaco === -1) {
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

  // `coluna.largura` (19-08-2026, pedido do Lucas em Tipos de Link: "o
  // exato mesmo espaçamento" pras 4 colunas Sim/Não da tabela - hoje cada
  // uma tinha uma largura diferente porque table-layout: auto (padrão do
  // HTML) mede pela PALAVRA do cabeçalho, e "Atualização"/"Recompensa"
  // são bem mais compridas que "Perfil"/"Ativo"). Opcional, string CSS
  // (ex.: '9.25rem') - diferente de `centralizar`/coluna-id (que a
  // própria GenericTable decide sozinha, sniffando o dado), largura
  // exata é uma decisão de design por tela, não dá pra inferir do dado
  // (duas tabelas diferentes podem ter o mesmo tipo de coluna e ainda
  // assim precisar de larguras diferentes uma da outra).
  //
  // `minLargurasColunas` (25-08-2026, achado do Lucas: "as colunas
  // dançam ao trocar de página") - table-layout: auto recalcula a
  // largura de cada coluna com base SÓ nas linhas visíveis; trocar de
  // página muda o conjunto visível, a largura muda junto. Calculado aqui
  // a partir de `linhas` INTEIRA (não linhasPagina - a lista completa já
  // está toda no navegador, ver comentário de `listar` no topo do
  // arquivo), então só recalcula quando o dado de verdade muda (uma
  // busca nova), nunca ao virar página - o PISO já nasce igual ao maior
  // valor possível em qualquer página, então nunca precisa crescer nem
  // encolher ao trocar.
  //
  // `min-width`, não `width` de propósito (25-08-2026, 2ª tentativa -
  // a 1ª usava table-layout: fixed + width, e travar TODA coluna ao
  // mesmo tempo fazia o navegador esticar/espremer todas
  // proporcionalmente pra preencher os 100% da tabela, incluindo em
  // telas estreitas onde não sobra espaço - texto acabava invadindo a
  // célula vizinha, mesmo dentro de um wrapper com overflow-x: auto,
  // porque width:100% nunca deixava a tabela ficar mais larga que o
  // wrapper pra ter algo de verdade pra rolar). `min-width` sob
  // table-layout: auto (o padrão de sempre, não mudou) é só um PISO -
  // mesma filosofia já usada em `.crud-tabela__coluna-id` (`width: 4rem`
  // ali já funciona como piso, não teto, sob auto) - a coluna nunca
  // fica mais estreita que isto, mas continua livre pra crescer ou (em
  // tela apertada) a tabela inteira virar mais larga que o card e rolar
  // de lado, exatamente como já acontecia antes de qualquer mudança de
  // hoje. Aproximação por contagem de caractere (1ch ≈ 1 caractere do
  // maior valor da coluna, cabeçalho incluso, +2ch de respiro) - não é
  // pixel perfeito, mas resolve a dança sem arriscar o responsivo.
  // Teto de 40ch (8ch pra coluna "id", pedido à parte do Lucas: "é a
  // primeira coluna, não precisa ser muito larga") pra um valor isolado
  // excepcionalmente longo não pedir um piso enorme sozinho. `coluna.
  // largura` continua ganhando quando existe - decisão manual explícita
  // nunca é sobrescrita pelo cálculo automático.
  // Coluna centralizada (número/booleano/`centralizar`) NÃO usa o rótulo do
  // cabeçalho como piso (25-08-2026, achado do Lucas: "E-mail verificado"
  // como cabeçalho tem 17 caracteres, mas o DADO é só "Sim"/"Não" - era o
  // texto do título, não o valor, que forçava a coluna a ficar larga).
  // `maiorTamanho` começa em 0 pra essas (só cresce com o valor de verdade,
  // sempre curto: número, "Sim"/"Não", badge de status), deixando o
  // cabeçalho livre pra quebrar em 2 linhas sozinho quando a coluna aperta
  // - sem precisar de `<br/>` manual no rótulo nem CSS novo, é só o
  // `white-space` padrão do navegador (nenhuma regra força nowrap em `th`
  // fora da coluna id). Colunas de texto normal (nome, papel, email...)
  // continuam contando o rótulo, sem mudança - a única com esse problema
  // era uma coluna centralizada com rótulo comprido e valor curto.
  const minLargurasColunas = useMemo(() => {
    const resultado: Record<string, string> = {};
    colunas.forEach((coluna) => {
      if (coluna.largura) {
        return;
      }
      const ehId = coluna.chave === colunaIdChave;
      const ehCentralizada = colunasCentralizadas.has(coluna.chave);
      let maiorTamanho = ehCentralizada ? 0 : coluna.rotulo.length;
      linhas.forEach((linha) => {
        const tamanho = String(linha[coluna.chave] ?? '').length;
        if (tamanho > maiorTamanho) {
          maiorTamanho = tamanho;
        }
      });
      // ERA 40 (25-08-2026, ajustado pra 28) - achado do Lucas testando ao
      // vivo: com 40ch de teto, uma coluna de valor naturalmente longo
      // (nome, email) só alcança o PRÓPRIO piso de verdade (e só aí passa
      // a quebrar linha/apertar) numa tela já bem estreita - colunas de
      // valor curto (papel, e-mail verificado) alcançam o piso delas bem
      // antes, dando a sensação de que "aperta tudo, menos essas duas".
      // min-width continua sendo só um PISO (não um teto de verdade - a
      // coluna cresce livre numa tela larga, isso não muda em nada); 28ch
      // só faz ela poder encolher (e por tabela, o <td> sem nowrap
      // nenhum, QUEBRAR linha) mais cedo quando a tela aperta de verdade,
      // em vez de segurar a largura total do maior e-mail/nome até o
      // último instante.
      const teto = ehId ? 8 : 28;
      resultado[coluna.chave] = Math.min(teto, maiorTamanho + 2) + 'ch';
    });
    return resultado;
  }, [linhas, colunas, colunaIdChave, colunasCentralizadas]);

  const estiloColuna = (coluna: Coluna<T>) =>
    coluna.largura
      ? { width: coluna.largura }
      : minLargurasColunas[coluna.chave]
        ? { minWidth: minLargurasColunas[coluna.chave] }
        : undefined;

  const { totalPaginas, paginaAtual, itensPagina: linhasPagina } = paginarClientSide(linhasOrdenadas, pagina, tamanhoPagina);

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
        <h2 className="titulo-secao">{titulo}</h2>
        {acaoTopo && <div className="crud-secao__acao-topo">{acaoTopo}</div>}
      </div>

      {!carregando && (
        <BarraFiltros
          mostrarBusca={linhas.length > LIMIAR_FILTRO}
          valorBusca={filtro}
          aoMudarBusca={(valor) => atualizarParametros({ q: valor, pagina: null })}
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
      )}

      {carregando ? (
        // Esqueleto em vez de texto "Carregando..." - padrão comum em
        // painel admin (Linear, Stripe, Vercel): já mostra o formato da
        // tabela (mesmas colunas) enquanto os dados reais não chegam, em
        // vez de um texto solto que faz a tela "pular" quando os dados
        // aparecem.
        <div className="crud-tabela__wrapper">
        <table className="crud-tabela">
          <thead>
            <tr>
              {colunas.map((coluna) => (
                <th
                  key={coluna.chave}
                  className={classesCabecalho(coluna).trim() || undefined}
                  style={estiloColuna(coluna)}
                >
                  {rotuloColuna(coluna)}
                </th>
              ))}
              {colunaExtra && <th>{colunaExtra.rotulo}</th>}
              {/* Sem min-width calculado de propósito (25-08-2026) - ao
                  contrário das colunas de dado, Ações mostra sempre os
                  MESMOS botões em toda linha/página (nunca "dança" ao
                  paginar), então o piso artificial só atrapalhava: abaixo
                  de 1400px o texto some e vira ícone-só (ver @media em
                  5-crud.css), mas o min-width antigo (calculado pro modo
                  COM texto) continuava travado, sobrando espaço reservado
                  à toa e empurrando o ícone de Excluir pra fora da tela -
                  table-layout: auto já dimensiona certo sozinho nos dois
                  modos, sem ajuda nenhuma daqui. */}
              {temAcoes && <th className="crud-tabela__celula--centralizada">Ações</th>}
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
                {colunaExtra && (
                  <td>
                    <div className="h-3.5 fundo-sutil rounded"></div>
                  </td>
                )}
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
          <div className="crud-tabela__wrapper">
          <table className="crud-tabela">
            <thead>
              <tr>
                {colunas.map((coluna) => (
                  <th
                    key={coluna.chave}
                    className={'crud-tabela__ordenavel' + classesCabecalho(coluna)}
                    style={estiloColuna(coluna)}
                    onClick={() => aoClicarColuna(coluna.chave)}
                  >
                    {rotuloColuna(coluna)}
                    {ordenacao.chave === coluna.chave && (ordenacao.direcao === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
                {colunaExtra && <th>{colunaExtra.rotulo}</th>}
                {temAcoes && <th className="crud-tabela__celula--centralizada">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {linhasPagina.map((linha) => (
                <tr key={String(linha[chavePrimaria])}>
                  {colunas.map((coluna) => (
                    <td
                      key={coluna.chave}
                      className={classesColuna(coluna).trim() || undefined}
                      style={estiloColuna(coluna)}
                    >
                      {/* `renderizar` (09-08-2026, tabela Permissões: botão
                          "Saiba mais" no lugar do valor cru) - opcional, só
                          uma coluna especial precisa disso, as outras
                          continuam mostrando o dado normal. */}
                      {coluna.renderizar
                        ? coluna.renderizar(linha)
                        : celulaValor(linha[coluna.chave])}
                    </td>
                  ))}
                  {colunaExtra && <td>{colunaExtra.renderizar(linha)}</td>}
                  {temAcoes && (
                    <td>
                      {/* Texto/ícone discreto, não botão sólido (08-08-2026).
                          Ícone com uma cor fraquinha (09-08-2026, pedido do
                          Lucas: "voltar a dar as cores das ações... mas mais
                          fraquinho, só pra dar mais vida") - ver
                          .crud-tabela__acao--alterar/--excluir em
                          5-crud.css. Texto continua neutro nos dois casos.
                          Ordem de exibição É FIXA (alterar → consultar →
                          excluir), independente da ordem das chaves em
                          `acoes` - só a PRESENÇA da chave decide se o botão
                          aparece. */}
                      <div className="crud-tabela__acoes">
                        {aoAlterarLinha && (
                          <AcaoLinha
                            rotulo="Alterar"
                            icone="fa-pen"
                            variante="alterar"
                            onClick={() => aoAlterarLinha(linha)}
                          />
                        )}
                        {aoConsultarLinha && (
                          <AcaoLinha
                            rotulo="Consultar"
                            icone="fa-eye"
                            onClick={() => aoConsultarLinha(linha)}
                          />
                        )}
                        {aoExcluirLinha && (
                          <AcaoLinha
                            rotulo="Excluir"
                            icone="fa-trash"
                            variante="excluir"
                            onClick={() => aoExcluirLinha(linha)}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {linhasPagina.length === 0 && !erro && (
                <tr>
                  <td colSpan={colunas.length + (colunaExtra ? 1 : 0) + (temAcoes ? 1 : 0)}>
                    {filtro || algumaFacetaAtiva
                      ? 'Nenhum registro bate com o filtro.'
                      : 'Nenhum registro.'}
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

      {erro && <p className="crud-erro">{erro}</p>}
    </section>
  );
}
