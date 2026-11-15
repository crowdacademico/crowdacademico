import { Link } from 'react-router';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';

// Sobre (15-11-2026): página de IDENTIDADE do projeto (por que existe, para quem, o que defende). A mecânica da
// plataforma (curadoria, prazos, repasse) mora em Como funciona; os números, em Taxas e transparência.
const PROBLEMAS = [
  {
    icone: 'fa-hourglass-half',
    titulo: 'Editais demoram e oscilam',
    texto:
      'Entre enviar um projeto e receber o recurso podem passar meses, às vezes mais de um ano, e a abertura dos editais muda conforme o orçamento público de cada período.',
  },
  {
    icone: 'fa-door-closed',
    titulo: 'Nem todo pesquisador chega ao edital',
    texto:
      'Quem está começando a carreira, trabalha em instituição menor ou não tem vínculo com um programa de pós-graduação compete em desvantagem com grupos já consolidados.',
  },
  {
    icone: 'fa-circle-question',
    titulo: 'Plataformas genéricas não distinguem pesquisa',
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
    titulo: 'Orçamento e cronograma desde o início',
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

export function Sobre() {
  return (
    <div className="pagina-publica fundo-pagina min-h-full py-16">
      <div className="mx-auto max-w-4xl px-4">
        <CabecalhoPagina
          className="mb-14"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PROBLEMAS.map((problema) => (
              <article key={problema.titulo} className="pagina-publica__cartao">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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