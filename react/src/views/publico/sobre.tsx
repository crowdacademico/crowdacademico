import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';

const ETAPAS_CURADORIA = [
  {
    numero: '01',
    titulo: 'Submissão',
    texto: 'O pesquisador apresenta a proposta e as informações necessárias para sua avaliação.',
  },
  {
    numero: '02',
    titulo: 'Conferência',
    texto: 'As informações da campanha são conferidas antes de ela seguir para avaliação.',
  },
  {
    numero: '03',
    titulo: 'Avaliação',
    texto: 'A curadoria analisa a clareza e a consistência das informações do projeto.',
  },
  {
    numero: '04',
    titulo: 'Publicação',
    texto: 'Quando aprovada, a campanha fica disponível para consulta pública.',
  },
];

export function Sobre() {
  return (
    <div className="pagina-publica fundo-pagina min-h-full py-16">
      <div className="mx-auto max-w-4xl px-4">
        <CabecalhoPagina
          className="mb-14"
          descricao="Conheça a missão, a curadoria e os princípios que orientam a plataforma."
          titulo="Sobre o CrowdAcadêmico"
        />

        <section aria-labelledby="missao" className="mb-14">
          <h2 id="missao" className="titulo-secao mb-4">
            Nossa missão
          </h2>
          <div className="flex flex-col gap-4">
            <p className="paragrafo texto-padrao">
              O CrowdAcadêmico busca aproximar a sociedade da pesquisa científica,
              conectando projetos de pesquisadores a pessoas interessadas em conhecê-los
              e apoiá-los.
            </p>
            <p className="paragrafo texto-padrao">
              A plataforma reúne informações sobre as propostas e seus avanços para
              facilitar o diálogo entre a comunidade e a ciência produzida no Brasil.
            </p>
          </div>
        </section>

        <section aria-labelledby="curadoria" className="mb-14">
          <h2 id="curadoria" className="titulo-secao mb-2">
            Como funciona a curadoria
          </h2>
          <p className="paragrafo texto-padrao mb-6">
            As campanhas passam por uma avaliação antes de serem publicadas.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ETAPAS_CURADORIA.map((etapa) => (
              <article key={etapa.numero} className="pagina-publica__cartao pagina-publica__etapa">
                <span className="pagina-publica__indice">{etapa.numero}</span>
                <h3 className="subtitulo mt-4 mb-2">{etapa.titulo}</h3>
                <p className="paragrafo texto-padrao">{etapa.texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="moderacao">
          <h2 id="moderacao" className="titulo-secao mb-4">
            Moderação e denúncias
          </h2>
          <p className="paragrafo texto-padrao">
            Visitantes e apoiadores podem sinalizar conteúdo que precise de revisão. As
            denúncias são analisadas pela moderação, que aplica as medidas previstas para
            cada situação.
          </p>
        </section>
      </div>
    </div>
  );
}
