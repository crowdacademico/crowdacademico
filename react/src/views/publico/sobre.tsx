import { Link } from 'react-router';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';
import { useAlturaIgual } from '../../components/layout/use-altura-igual';

// Sobre (15-11-2026): página de IDENTIDADE do projeto (por que existe, para quem, o que defende). A mecânica da
// plataforma (curadoria, prazos, repasse) mora em Como funciona; os números, em Taxas e transparência.
const PROBLEMAS = [
  {
    icone: 'fa-hourglass-half',
    titulo: 'Editais lentos e incertos',
    texto:
      'Entre enviar um projeto e receber o recurso podem passar meses, às vezes mais de um ano, e a abertura dos editais muda conforme o orçamento público de cada período.',
  },
  {
    icone: 'fa-door-closed',
    titulo: 'Acesso desigual',
    texto:
      'Quem está começando a carreira, trabalha em instituição menor ou não tem vínculo com um programa de pós-graduação compete em desvantagem com grupos já consolidados.',
  },
  {
    icone: 'fa-circle-question',
    titulo: 'Vaquinhas genéricas',
    texto:
      'Em uma vaquinha comum, um projeto com metodologia definida aparece do mesmo jeito que um pedido pessoal. Pouco ajuda quem quer apoiar a saber a diferença.',
  },
] as const;

const PRINCIPIOS = [
  {
    icone: 'fa-flask',
    titulo: 'Feita só para pesquisa',
    texto:
      'Cada campanha é um projeto de pesquisa científica ou tecnológica, classificado por área do conhecimento, e passa por avaliação antes de ser publicada.',
  },
  {
    icone: 'fa-file-invoice-dollar',
    titulo: 'Orçamento e cronograma',
    texto:
      'Todo projeto precisa detalhar para onde vai cada real e quais são as etapas previstas. Essas informações ficam públicas na campanha.',
  },
  {
    icone: 'fa-arrows-rotate',
    titulo: 'Prestação de contas contínua',
    texto:
      'O pesquisador publica atualizações durante e depois da campanha, e quem apoia acompanha o andamento até o resultado.',
  },
  {
    icone: 'fa-id-card',
    titulo: 'Pesquisador identificado',
    texto:
      'A campanha é sempre de uma pessoa física, com perfil acadêmico e links como Lattes ou ORCID, para que haja um responsável claro por cada projeto.',
  },
] as const;

// Quem criou a plataforma (21-11-2026), em faixas: a foto ao lado das informações, como as páginas "Sobre" e
// "Equipe" de muitos sites. As duas faixas têm sempre a mesma altura (grade de linhas iguais) e as fotos o mesmo
// tamanho (400x500, WebP, ~10 KB; ver react/public/imagens). Campo vazio não aparece.
interface Criador {
  nome: string;
  foto: string;
  papel?: string;
  formacao?: string;
  resumo?: string;
  links?: { rotulo: string; href: string; icone: string; texto: string }[];
}

const CRIADORES: readonly Criador[] = [
  {
    nome: 'Lucas Novais de Oliveira',
    foto: '/imagens/criador-lucas-novais.webp',
    papel: 'Cocriador do CrowdAcadêmico',
    formacao: 'Tecnologia em Sistemas para Internet · IFSP, câmpus Birigui',
    resumo:
      'Programador full-stack em formação. Tem formação técnica em Administração pela Etec e voltou a estudar para se aprofundar em programação, a área que sempre o interessou.',
    links: [
      { rotulo: 'E-mail de Lucas', href: 'mailto:novais.oliveira@aluno.ifsp.edu.br', icone: 'fa-solid fa-envelope', texto: 'novais.oliveira@aluno.ifsp.edu.br' },
      { rotulo: 'GitHub de Lucas', href: 'https://github.com/lucasnovais01', icone: 'fa-brands fa-github', texto: 'github.com/lucasnovais01' },
    ],
  },
  {
    nome: 'Alexia Eduarda Celice Ferreira',
    foto: '/imagens/criador-alexia.webp',
    papel: 'Cocriadora do CrowdAcadêmico',
    formacao: 'Tecnologia em Sistemas para Internet · IFSP, câmpus Birigui',
    resumo:
      'Programadora full-stack em formação. É técnica em Informática integrado ao ensino médio e gosta de estudar e aprender coisas novas na área de tecnologia.',
    links: [
      { rotulo: 'E-mail de Alexia', href: 'mailto:alexia.eduarda@aluno.ifsp.edu.br', icone: 'fa-solid fa-envelope', texto: 'alexia.eduarda@aluno.ifsp.edu.br' },
      { rotulo: 'GitHub de Alexia', href: 'https://github.com/Alexia01Edu', icone: 'fa-brands fa-github', texto: 'github.com/Alexia01Edu' },
    ],
  },
];

function FaixaCriador({ criador }: { criador: Criador }) {
  return (
    <li className="pagina-publica__cartao flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
      <img
        src={criador.foto}
        alt={`Foto de ${criador.nome}`}
        width={160}
        height={200}
        loading="lazy"
        decoding="async"
        // Em tela larga, a foto acompanha a altura do cartão (que é a do texto) e avança 0,75rem sobre o espaço interno
        // no topo, embaixo e à esquerda: fica mais perto da borda sem o cartão crescer. No celular, tamanho fixo em cima.
        className="w-40 h-50 shrink-0 rounded-xl object-cover border borda-padrao sm:h-auto sm:self-stretch sm:-my-3 sm:-ml-3"
      />
      <div className="min-w-0">
        <h3 className="subtitulo texto-forte">{criador.nome}</h3>
        {criador.papel && <p className="paragrafo texto-marca enfase mt-1">{criador.papel}</p>}
        {criador.formacao && <p className="legenda texto-fraco mt-1">{criador.formacao}</p>}
        {criador.resumo && <p className="paragrafo texto-padrao mt-3">{criador.resumo}</p>}
        {criador.links && (
          <ul className="mt-4 flex flex-col gap-2">
            {criador.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-label={link.rotulo}
                  className="paragrafo texto-marca hover:underline break-all"
                  {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  <i className={`${link.icone} mr-2`} aria-hidden="true" />
                  {link.texto}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function Sobre() {
  // Cartões do mesmo bloco com a mesma altura (auto-rows-fr) e os títulos com a altura do mais alto do bloco, para os
  // parágrafos começarem juntos em todos os cartões, inclusive em linhas diferentes (22-11-2026).
  const blocoProblemas = useAlturaIgual<HTMLDivElement>('h3');
  const blocoPrincipios = useAlturaIgual<HTMLDivElement>('h3');
  const blocoPublico = useAlturaIgual<HTMLDivElement>('h3');
  return (
    <div className="pagina-publica fundo-pagina min-h-full py-16">
      <div className="largura-site w-full">
        {/* Largura única da área pública (DSP-34, 22-11-2026): títulos, parágrafos, as faixas de "Quem fez" e o cartão final
            usam o trilho inteiro; só os blocos de cartões ficam centralizados numa largura de 896 px. */}
        <CabecalhoPagina
          className="mb-14"
          descricaoLarga
          descricao="Uma plataforma brasileira de financiamento coletivo feita exclusivamente para a pesquisa científica e tecnológica."
          titulo="Sobre o CrowdAcadêmico"
        />

        <section aria-labelledby="sobre-porque" className="mb-14">
          <h2 id="sobre-porque" className="titulo-secao mb-4">
            Por que o CrowdAcadêmico existe
          </h2>
          <p className="paragrafo texto-padrao mb-6">
            No Brasil, a pesquisa depende em grande parte de editais públicos de fomento, como os do CNPq, da Capes e
            das fundações estaduais. O modelo funciona, mas deixa muita ciência sem recurso, principalmente a de menor
            porte, que não precisa de milhões, só de uma coleta de campo, de um equipamento ou de uma viagem.
          </p>
          <div ref={blocoProblemas} className="mx-auto grid max-w-4xl grid-cols-1 sm:auto-rows-fr gap-4 sm:grid-cols-3">
            {PROBLEMAS.map((problema) => (
              <article key={problema.titulo} className="pagina-publica__cartao flex flex-col items-center text-center">
                <span className="pagina-publica__perfil-icone" aria-hidden="true">
                  <i className={`fa-solid ${problema.icone}`} />
                </span>
                <h3 className="subtitulo mt-4 mb-2">{problema.titulo}</h3>
                <p className="paragrafo texto-padrao">{problema.texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="sobre-proposta" className="mb-14">
          <h2 id="sobre-proposta" className="titulo-secao mb-4">
            Nossa proposta
          </h2>
          <div className="mb-6 flex flex-col gap-4">
            <p className="paragrafo texto-padrao">
              O CrowdAcadêmico aproxima pesquisadores de pessoas que querem ver a ciência brasileira acontecer. Quem
              pesquisa consegue financiar o projeto do tamanho que ele realmente tem, sem esperar o próximo edital. Quem
              apoia sabe exatamente para onde vai o dinheiro, porque o orçamento é público antes mesmo de a campanha
              começar.
            </p>
            <p className="paragrafo texto-padrao">
              A viabilidade vem de muita gente apoiando um pouco, e não de poucos grandes financiadores. Por isso o
              apoio mínimo é baixo e o Pix é o meio principal de pagamento.
            </p>
          </div>
          <div ref={blocoPrincipios} className="mx-auto grid max-w-4xl grid-cols-1 sm:auto-rows-fr gap-4 sm:grid-cols-2">
            {PRINCIPIOS.map((principio) => (
              <article key={principio.titulo} className="pagina-publica__cartao flex items-start gap-4">
                <span className="pagina-publica__perfil-icone shrink-0" aria-hidden="true">
                  <i className={`fa-solid ${principio.icone}`} />
                </span>
                <div>
                  <h3 className="subtitulo mb-2">{principio.titulo}</h3>
                  <p className="paragrafo texto-padrao">{principio.texto}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="sobre-publico" className="mb-14">
          <h2 id="sobre-publico" className="titulo-secao mb-4">
            Para quem é
          </h2>
          <div ref={blocoPublico} className="mx-auto grid max-w-4xl grid-cols-1 sm:auto-rows-fr gap-4 sm:grid-cols-2">
            <article className="pagina-publica__cartao">
              <h3 className="subtitulo mb-2">Pesquisadores</h3>
              <p className="paragrafo texto-padrao">
                Em especial quem está no mestrado, no doutorado ou no início da carreira, quem trabalha em instituições
                menores e quem pesquisa de forma independente. É o público que os editais atendem com mais dificuldade.
              </p>
            </article>
            <article className="pagina-publica__cartao">
              <h3 className="subtitulo mb-2">Apoiadores</h3>
              <p className="paragrafo texto-padrao">
                Qualquer pessoa que queira conhecer e apoiar uma pesquisa: quem se interessa por ciência, ex-alunos de
                uma instituição, quem é afetado pelo tema de um estudo ou empresas e profissionais da área.
              </p>
            </article>
          </div>
        </section>

        <section aria-labelledby="sobre-nome" className="mb-14">
          <h2 id="sobre-nome" className="titulo-secao mb-4">
            O nome e a marca
          </h2>
          <p className="paragrafo texto-padrao">
            CrowdAcadêmico junta <em>crowd</em>, a multidão que financia em conjunto, e <em>acadêmico</em>, o
            conhecimento produzido nas universidades e nos institutos de pesquisa. A identidade visual parte da ideia de
            união entre ciência, participação humana e apoio à pesquisa.
          </p>
        </section>

        <section aria-labelledby="sobre-origem" className="mb-14">
          <h2 id="sobre-origem" className="titulo-secao mb-4">
            De onde vem
          </h2>
          <p className="paragrafo texto-padrao">
            O CrowdAcadêmico nasceu em 2026 como Trabalho de Conclusão de Curso do Curso Superior de Tecnologia em
            Sistemas para Internet, no Instituto Federal de São Paulo, câmpus Birigui. O projeto começou de uma pergunta
            simples: e se financiar uma pesquisa pudesse ser tão fácil e tão claro quanto apoiar qualquer outra causa?
          </p>
        </section>

        <section aria-labelledby="sobre-criadores" className="mb-14">
          <h2 id="sobre-criadores" className="titulo-secao mb-4">
            Quem fez
          </h2>
          <ul className="grid auto-rows-fr gap-5">
            {CRIADORES.map((criador) => (
              <FaixaCriador key={criador.nome} criador={criador} />
            ))}
          </ul>
        </section>

        <section aria-label="Continue conhecendo a plataforma" className="pagina-publica__cartao">
          <h2 className="subtitulo mb-2">Quer ver como isso funciona na prática?</h2>
          <p className="paragrafo texto-padrao mb-5">
            Explore as campanhas publicadas ou entenda cada etapa, da proposta ao resultado.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/explorar" className="btn btn-primary">
              Explorar campanhas
            </Link>
            <Link to="/como-funciona" className="btn">
              Como funciona
            </Link>
            <Link to="/transparencia" className="texto-marca font-bold hover:underline">
              Taxas e transparência
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}