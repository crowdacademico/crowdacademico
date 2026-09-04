import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useErroToast } from '../layout/use-erro-toast';
import { LogAuditoriaPainel } from './log-auditoria-painel';

const TAMANHOS_PAGINA = [10, 20, 30, 'todos'];
const LIMIAR_FILTRO = 5;

// Valor booleano vira badge colorido (Sim/Não), não o texto cru "true"/
// "false" - muito mais legível numa lista (achado do Claude Web, rodando
// o painel de verdade: "E-MAIL VERIFICADO: false" não é instantâneo de
// ler, um badge é).
function celulaValor(valor) {
  if (typeof valor === 'boolean') {
    return (
      <span className={'badge ' + (valor ? 'badge-sucesso' : 'badge-neutro')}>
        {valor ? 'Sim' : 'Não'}
      </span>
    );
  }
  return String(valor ?? '');
}

// Tabela genérica de LISTAGEM (leitura, filtro, ordenação, paginação) usada
// pelo painel admin - cada módulo novo do Nest com listagem simples vira só
// uma entrada de colunas aqui, não uma tela nova escrita do zero.
//
// Criar/Alterar/Excluir NÃO acontecem mais aqui dentro (pedido do Lucas,
// 02-08-2026: "tudo que faz parte do CRUD precisa de view própria" - mesmo
// padrão já usado em views/1-usuario/criar-usuario.jsx). Passando
// `rotaBase` (ex.: "/usuarios"), cada linha ganha "Alterar"/"Excluir"
// apontando pra `${rotaBase}/${id}/alterar` e `/excluir` - páginas de
// verdade, com sua própria URL, não formulário/confirm() embutido na
// tabela. Sem `rotaBase` (catálogos só-leitura como Papéis/Permissões),
// não aparece coluna de Ações nenhuma.
//
// `buscarLog` (opcional, pedido do Lucas 03-08-2026: "um botão no fundo de
// cada tabela pra ver a última alteração") - mesma convenção de `listar`:
// função já pré-amarrada (authFetch + nome físico da tabela) pelo
// componente pai (ver listar-usuarios.jsx/listar-configuracoes.jsx). Sem
// essa prop, o botão "Ver log" nem aparece - nem toda tabela tem
// log_auditoria aplicado (só as que passam por `fn_log_auditoria()`, ver
// 05_regras_negocio.sql [05-L]).
const ACOES_PADRAO = ['alterar', 'consultar', 'excluir'];

export function GenericTable({
  titulo,
  acaoTopo,
  colunas,
  chavePrimaria,
  listar,
  rotaBase,
  buscarLog,
  // Repassado direto pro LogAuditoriaPainel (09-08-2026, ver comentário lá)
  // - troca a coluna genérica "Campos alterados" por "De"/"Para" lendo
  // esse campo específico de dadosAnteriores/dadosNovos.
  campoRenomeioLog,
  // Quais dos 3 botões padrão aparecem, quando `rotaBase` está presente
  // (03-08-2026, pedido do Lucas: Papéis precisa só de "Alterar" - sem
  // Consultar (a tabela já mostra tudo, mesma decisão já tomada pra
  // Usuário/Configuração) e sem Excluir (apagar um papel usado em RBAC é
  // decisão maior, fora de escopo). Default preserva o comportamento de
  // sempre (todo `rotaBase` já existente continua com os 3 botões).
  acoes = ACOES_PADRAO,
  // Coluna adicional genérica (09-08-2026, Bloco F: botão "ⓘ" que abre um
  // modal de detalhe por linha, na tabela Permissões) - `{ rotulo,
  // renderizar(linha) }`. Existe separada de `colunas` (que só espera
  // valor de dado bruto) porque esta pode renderizar QUALQUER coisa
  // (botão, ícone, badge composto), não só `String(valor)`. Independe de
  // `rotaBase`/`acoes` - tabelas só-leitura (sem Ações) também podem usar.
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
}) {
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro, limparErro } = useErroToast();
  // Filtro/página/ordenação/faceta vivem na URL (query string), não em
  // useState local (22-08-2026, pedido do Lucas: ao voltar de "Consultar"
  // via navigate(-1), o filtro escolhido resetava - a página de listagem
  // é desmontada na troca de rota, e useState não sobrevive a isso).
  // `{ replace: true }` em toda escrita: cada clique em filtro/página/
  // ordenação SUBSTITUI a entrada atual do histórico em vez de empilhar
  // uma nova - só o clique em "Consultar" (Link de verdade) empilha,
  // então o botão "Voltar" (navigate(-1), ver consultar-usuario.jsx e
  // afins) sempre volta pro último estado de filtro, não pro passo-a-passo
  // de cada clique dentro do dropdown.
  // Nomes reservados na URL: q, pagina, tamanho, ordenar, dir - evitar
  // faceta com uma dessas `chave` (nenhuma das existentes hoje usa).
  const [searchParams, setSearchParams] = useSearchParams();

  const atualizarParametros = (atualizacoes) => {
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
  // Só busca quando abre (não em toda carga da tabela) - a maioria das
  // visitas a uma listagem não vai clicar em "Ver log". Fica de fora da
  // URL de propósito - é estado de UI (painel aberto), não um filtro de
  // QUAIS dados aparecem.
  const [logAberto, setLogAberto] = useState(false);
  // Só 1 dropdown de faceta aberto por vez (chave de qual está aberta, ou
  // null) - mais simples que um booleano por faceta, e evita 2 dropdowns
  // abertos sobrepondo um no outro quando são vários lado a lado. Também
  // fora da URL, mesmo motivo do `logAberto` acima.
  const [facetaAbertaChave, setFacetaAbertaChave] = useState(null);
  // Seleção de cada faceta, independente: { [chave]: string[] }. Faceta
  // sem entrada aqui (ou array vazio) = "Todos" pra ela.
  const selecoesPorFaceta = useMemo(() => {
    const resultado = {};
    (filtrosFacetados ?? []).forEach((faceta) => {
      const valor = searchParams.get(faceta.chave);
      resultado[faceta.chave] = valor ? valor.split(',').filter(Boolean) : [];
    });
    return resultado;
  }, [searchParams, filtrosFacetados]);
  const facetasRef = useRef(null);

  // Fechar ao clicar fora (09-08-2026) - ERA onBlur+relatedTarget (mesmo
  // padrão do DevLoginRapido), mas com checkbox dentro de <label> isso
  // fecha o dropdown ANTES do clique completar: o mousedown num elemento
  // não-focável (o texto do <label>) dispara blur no botão que abriu o
  // dropdown com relatedTarget ainda nulo (o navegador só decide o próximo
  // foco depois), o guard via de que "saiu do container" e fecha - achado
  // ao vivo pelo Lucas ("clico em qualquer coisa que não seja o
  // quadradinho, o filtro fecha e não faz nada"). Listener de mousedown no
  // document, comparando o alvo do clique com o container (o ref cobre
  // TODAS as facetas juntas, não uma por vez) por `contains()`, não
  // depende de foco nenhum - fecha só quando o clique é GEOMETRICAMENTE
  // fora de qualquer uma delas. Clicar no botão de OUTRA faceta ainda está
  // dentro do container, então só troca qual está aberta, não fecha tudo.
  useEffect(() => {
    if (facetaAbertaChave === null) {
      return undefined;
    }
    const aoClicarFora = (evento) => {
      if (facetasRef.current && !facetasRef.current.contains(evento.target)) {
        setFacetaAbertaChave(null);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [facetaAbertaChave]);

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
    const resultado = {};
    (filtrosFacetados ?? []).forEach((faceta) => {
      const valores = new Set();
      linhas.forEach((linha) => {
        String(linha[faceta.chave] ?? '')
          .split(',')
          .map((valor) => valor.trim())
          .filter(Boolean)
          .forEach((valor) => valores.add(valor));
      });
      const lista = [...valores];
      if (faceta.ordem) {
        const posicao = (valor) => {
          const indice = faceta.ordem.indexOf(valor);
          return indice === -1 ? faceta.ordem.length : indice;
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
    (faceta) => (selecoesPorFaceta[faceta.chave]?.length ?? 0) > 0,
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
      if (selecionados && selecionados.length > 0) {
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
    if (!ordenacao.chave) {
      return linhasFiltradas;
    }
    const linhaComValor = linhas.find(
      (linha) => linha[ordenacao.chave] !== null && linha[ordenacao.chave] !== undefined,
    );
    const tipo = typeof linhaComValor?.[ordenacao.chave];
    const sinal = ordenacao.direcao === 'asc' ? 1 : -1;

    return [...linhasFiltradas].sort((a, b) => {
      const valorA = a[ordenacao.chave];
      const valorB = b[ordenacao.chave];
      if (tipo === 'number') {
        return (valorA - valorB) * sinal;
      }
      if (tipo === 'boolean') {
        return (valorA === valorB ? 0 : valorA ? 1 : -1) * sinal;
      }
      return String(valorA ?? '').localeCompare(String(valorB ?? ''), 'pt-BR') * sinal;
    });
  }, [linhasFiltradas, linhas, ordenacao]);

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
    const chaves = new Set();
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
  const classesColuna = (coluna) =>
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
  // `.crud-tabela__quebra-rotulo`, ver 4-crud.css) e só "ligada" abaixo
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
  // nowrap` (ver 4-crud.css) - sem isso, o navegador ainda podia quebrar
  // sozinho no espaço (agora corrigido, ver comentário de rotuloColuna)
  // antes do breakpoint escolhido, reproduzindo a mesma oscilação de
  // antes, só que "certa" em vez de errada no hífen. `white-space:
  // nowrap` não impede o `<br>` explícito de funcionar quando ativo -
  // só impede quebra ESPONTÂNEA no espaço; são coisas diferentes em CSS.
  const classesCabecalho = (coluna) =>
    classesColuna(coluna) + (coluna.quebrarRotulo ? ' crud-tabela__rotulo-controlado' : '');

  const rotuloColuna = (coluna) => {
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
    const resultado = {};
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

  const estiloColuna = (coluna) =>
    coluna.largura
      ? { width: coluna.largura }
      : minLargurasColunas[coluna.chave]
        ? { minWidth: minLargurasColunas[coluna.chave] }
        : undefined;

  // "todos" (pedido do Lucas: opção de ver 10/20/30/todos os registros,
  // além de Anterior/Próxima) vira 1 página só, com a lista inteira.
  const totalPaginas =
    tamanhoPagina === 'todos'
      ? 1
      : Math.max(1, Math.ceil(linhasOrdenadas.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasPagina =
    tamanhoPagina === 'todos'
      ? linhasOrdenadas
      : linhasOrdenadas.slice(
          (paginaAtual - 1) * tamanhoPagina,
          paginaAtual * tamanhoPagina,
        );

  const aoClicarColuna = (chave) => {
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

      {!carregando &&
        (linhas.length > LIMIAR_FILTRO ||
          (filtrosFacetados ?? []).some((faceta) => (opcoesPorFaceta[faceta.chave]?.length ?? 0) > 1)) && (
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {linhas.length > LIMIAR_FILTRO && (
              <input
                type="search"
                placeholder="Filtrar..."
                value={filtro}
                onChange={(evento) => {
                  atualizarParametros({ q: evento.target.value, pagina: null });
                }}
                className="w-full sm:w-64 border borda-forte rounded-lg fundo-sutil py-2 px-3 text-sm outline-none focus:border-primary"
              />
            )}

            {/* Filtros por faceta (09-08-2026), lado a lado - 1+ dropdowns,
                cada um só aparece se houver mais de 1 valor possível (com 1
                só, filtrar não faria diferença nenhuma). O ref cobre TODAS
                juntas (ver useEffect de clicar fora, acima) - clicar no
                botão de uma enquanto outra está aberta só troca qual está
                aberta, não fecha as duas. */}
            {(filtrosFacetados ?? []).length > 0 && (
              <div className="flex items-center gap-3 flex-wrap" ref={facetasRef}>
                {filtrosFacetados.map((faceta) => {
                  const opcoes = opcoesPorFaceta[faceta.chave] ?? [];
                  if (opcoes.length <= 1) {
                    return null;
                  }
                  const selecionados = selecoesPorFaceta[faceta.chave] ?? [];
                  const aberta = facetaAbertaChave === faceta.chave;

                  return (
                    <div key={faceta.chave} className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setFacetaAbertaChave((atual) => (atual === faceta.chave ? null : faceta.chave))
                        }
                        className="btn btn-secondary text-sm flex items-center gap-2"
                      >
                        <i className="fa-solid fa-filter"></i>
                        {faceta.rotulo}
                        {selecionados.length > 0 ? (
                          <span className="badge badge-sucesso">{selecionados.length}</span>
                        ) : (
                          <span className="texto-fraco font-normal">(Todos)</span>
                        )}
                        <i className="fa-solid fa-chevron-down text-xs"></i>
                      </button>

                      {aberta && (
                        <div className="absolute left-0 mt-1 w-56 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              atualizarParametros({ [faceta.chave]: null, pagina: null });
                            }}
                            className="w-full text-left px-3 py-2 text-sm font-bold hover:bg-primary/10 border-b borda-padrao flex items-center justify-between"
                          >
                            Todos
                            {selecionados.length === 0 && <i className="fa-solid fa-check texto-sucesso"></i>}
                          </button>
                          <div className="max-h-64 overflow-y-auto">
                            {opcoes.map((opcao) => {
                              const marcado = selecionados.includes(opcao);
                              const alternar = () => {
                                const novoValor = marcado
                                  ? selecionados.filter((valor) => valor !== opcao)
                                  : [...selecionados, opcao];
                                atualizarParametros({
                                  [faceta.chave]: novoValor.length > 0 ? novoValor.join(',') : null,
                                  pagina: null,
                                });
                              };
                              return (
                                // Clique na linha toda alterna, não só na
                                // caixinha (09-08-2026, achado do Lucas:
                                // "clico em qualquer coisa que não seja o
                                // quadradinho e não faz nada"). 2 casos,
                                // tratados diferente de propósito: clique
                                // DIRETO na caixinha deixa o navegador fazer
                                // o que já sabe fazer sozinho (onChange do
                                // <input>, ver abaixo) - é o jeito mais
                                // confiável de manter o visual sincronizado,
                                // sem gambiarra. Clique no TEXTO (o alvo não
                                // é o <input>) chama `alternar()` aqui e
                                // cancela o encaminhamento nativo pro
                                // <input> por baixo (preventDefault) - sem
                                // isso, o clique alternaria a caixinha 2x
                                // (uma vez aqui, outra pelo encaminhamento)
                                // e cancelaria a mudança.
                                <label
                                  key={opcao}
                                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 cursor-pointer"
                                  onClick={(evento) => {
                                    if (evento.target.tagName !== 'INPUT') {
                                      evento.preventDefault();
                                      alternar();
                                    }
                                  }}
                                >
                                  <input type="checkbox" checked={marcado} onChange={alternar} />
                                  {opcao}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                  4-crud.css), mas o min-width antigo (calculado pro modo
                  COM texto) continuava travado, sobrando espaço reservado
                  à toa e empurrando o ícone de Excluir pra fora da tela -
                  table-layout: auto já dimensiona certo sozinho nos dois
                  modos, sem ajuda nenhuma daqui. */}
              {rotaBase && <th className="crud-tabela__celula--centralizada">Ações</th>}
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
                {rotaBase && (
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
                {rotaBase && <th className="crud-tabela__celula--centralizada">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {linhasPagina.map((linha) => (
                <tr key={linha[chavePrimaria]}>
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
                  {rotaBase && (
                    <td>
                      {/* Texto/ícone discreto, não botão sólido (08-08-2026).
                          Ícone com uma cor fraquinha (09-08-2026, pedido do
                          Lucas: "voltar a dar as cores das ações... mas mais
                          fraquinho, só pra dar mais vida") - ver
                          .crud-tabela__acao--alterar/--excluir em
                          4-crud.css. Texto continua neutro nos dois casos.
                          Texto em <span> próprio (não solto ao lado do
                          <i>) - precisa de um elemento pra sumir sozinho
                          via CSS quando a coluna aperta; `aria-label` no
                          <Link> garante que o botão continua tendo nome
                          acessível pra leitor de tela mesmo com o texto
                          escondido (display:none tira do texto da árvore
                          de acessibilidade também, não só da tela).
                          `.crud-tabela__acao-dica` (18-08-2026, pedido da
                          Alexia: "ao passar o mouse por cima dos ícones de
                          ação, queria que aparecesse o texto da ação") -
                          mesmo mecanismo CSS puro (:hover/:focus) do
                          Tooltip em components/layout/tooltip.jsx, só que
                          aplicado direto no próprio link de ação em vez de
                          um "ⓘ" à parte (não faria sentido aqui: o ícone
                          JÁ é o elemento clicável). Sem `title=` nativo de
                          propósito - os dois juntos mostrariam 2 dicas
                          sobrepostas. */}
                      <div className="crud-tabela__acoes">
                        {acoes.includes('alterar') && (
                          <Link
                            className="crud-tabela__acao crud-tabela__acao--alterar"
                            to={`${rotaBase}/${linha[chavePrimaria]}/alterar`}
                            aria-label="Alterar"
                          >
                            <i className="fa-solid fa-pen"></i>
                            <span className="crud-tabela__acao-texto">Alterar</span>
                            <span className="crud-tabela__acao-dica" role="tooltip">Alterar</span>
                          </Link>
                        )}
                        {acoes.includes('consultar') && (
                          <Link
                            className="crud-tabela__acao"
                            to={`${rotaBase}/${linha[chavePrimaria]}/consultar`}
                            aria-label="Consultar"
                          >
                            <i className="fa-solid fa-eye"></i>
                            <span className="crud-tabela__acao-texto">Consultar</span>
                            <span className="crud-tabela__acao-dica" role="tooltip">Consultar</span>
                          </Link>
                        )}
                        {acoes.includes('excluir') && (
                          <Link
                            className="crud-tabela__acao crud-tabela__acao--excluir"
                            to={`${rotaBase}/${linha[chavePrimaria]}/excluir`}
                            aria-label="Excluir"
                          >
                            <i className="fa-solid fa-trash"></i>
                            <span className="crud-tabela__acao-texto">Excluir</span>
                            <span className="crud-tabela__acao-dica" role="tooltip">Excluir</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {linhasPagina.length === 0 && !erro && (
                <tr>
                  <td colSpan={colunas.length + (colunaExtra ? 1 : 0) + (rotaBase ? 1 : 0)}>
                    {filtro || algumaFacetaAtiva
                      ? 'Nenhum registro bate com o filtro.'
                      : 'Nenhum registro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {linhasOrdenadas.length > TAMANHOS_PAGINA[0] && (
            <div className="flex items-center justify-between flex-wrap gap-3 mt-3 text-sm texto-padrao">
              <span>
                Página {paginaAtual} de {totalPaginas} ({linhasOrdenadas.length} registros)
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold texto-padrao">
                  Mostrar
                  <select
                    value={tamanhoPagina}
                    onChange={(evento) => {
                      const valor = evento.target.value;
                      atualizarParametros({
                        tamanho: valor === String(TAMANHOS_PAGINA[0]) ? null : valor,
                        pagina: null,
                      });
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
                    onClick={() => {
                      const alvo = Math.max(1, paginaAtual - 1);
                      atualizarParametros({ pagina: alvo === 1 ? null : alvo });
                    }}
                    disabled={paginaAtual === 1}
                    className="btn btn-secondary"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => {
                      const alvo = Math.min(totalPaginas, paginaAtual + 1);
                      atualizarParametros({ pagina: alvo === 1 ? null : alvo });
                    }}
                    disabled={paginaAtual === totalPaginas}
                    className="btn btn-secondary"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {erro && <p className="crud-erro">{erro}</p>}

      {buscarLog && (
        <>
          <button
            type="button"
            onClick={() => setLogAberto((atual) => !atual)}
            className="btn btn-secondary mt-4"
          >
            {logAberto ? 'Esconder log' : 'Ver log'}
          </button>
          {logAberto && (
            <LogAuditoriaPainel buscar={buscarLog} campoRenomeio={campoRenomeioLog} />
          )}
        </>
      )}
    </section>
  );
}
