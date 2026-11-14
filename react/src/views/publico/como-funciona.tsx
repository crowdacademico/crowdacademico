import { useState } from 'react';
import { Link } from 'react-router';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';

const PERFIS = [
  {
    chave: 'visitante',
    titulo: 'Visitante',
    icone: 'fa-eye',
    chamada: 'Explore projetos sem barreira nenhuma',
    destaque: 'sem barreira',
    pontos: [
      'Navegue por campanhas publicadas sem criar conta',
      'Consulte as informações disponíveis em cada projeto',
      'Consulte o pesquisador responsável quando informado',
      'Filtre projetos por área e situação da campanha',
    ],
  },
  {
    chave: 'apoiador',
    titulo: 'Apoiador cadastrado',
    icone: 'fa-hand-holding-heart',
    chamada: 'Apoie com transparência total',
    destaque: 'transparência total',
    pontos: [
      'Consulte o histórico das suas contribuições',
      'Consulte atualizações publicadas nas campanhas',
      'Veja as informações publicadas sobre cada projeto',
      'Gerencie seus dados e preferências da conta',
    ],
  },
  {
    chave: 'pesquisador',
    titulo: 'Pesquisador',
    icone: 'fa-flask',
    chamada: 'Gerencie campanhas com controle real',
    destaque: 'controle real',
    pontos: [
      'Submeta projetos com orçamento e cronograma',
      'Acompanhe a avaliação e a situação da campanha',
      'Consulte a arrecadação registrada no projeto',
      'Publique atualizações sobre o andamento da pesquisa',
    ],
  },
] as const;

const ETAPAS_APOIO = [
  {
    numero: 1,
    titulo: 'Escolha um projeto',
    texto: 'Explore as campanhas e consulte os objetivos, o orçamento e as informações do pesquisador.',
  },
  {
    numero: 2,
    titulo: 'Defina seu apoio',
    texto: 'Escolha o valor e uma forma de pagamento disponível no checkout da campanha.',
  },
  {
    numero: 3,
    titulo: 'Acompanhe a pesquisa',
    texto: 'Consulte as atualizações publicadas pelo pesquisador na página do projeto.',
  },
  {
    numero: 4,
    titulo: 'Consulte o resultado',
    texto: 'O destino das contribuições depende do modelo de financiamento e do resultado da campanha.',
  },
] as const;

const MODELOS = [
  {
    criterio: 'Quando a meta é atingida',
    tudoOuNada: 'As contribuições são destinadas ao projeto conforme as regras de repasse.',
    flexivel: 'O valor arrecadado é destinado ao projeto conforme as regras de repasse.',
  },
  {
    criterio: 'Quando a meta não é atingida',
    tudoOuNada: 'As contribuições são devolvidas conforme as regras aplicáveis.',
    flexivel: 'O projeto pode receber o valor arrecadado, conforme as regras aplicáveis.',
  },
  {
    criterio: 'O que avaliar',
    tudoOuNada: 'Se a pesquisa depende de um valor mínimo para ser realizada.',
    flexivel: 'Se o projeto pode avançar mesmo sem alcançar a meta total.',
  },
] as const;

const REQUISITOS_PESQUISADOR = [
  {
    icone: 'fa-user-graduate',
    titulo: 'Perfil acadêmico',
    texto: 'Informe os dados acadêmicos solicitados e os links que ajudam a identificar sua trajetória de pesquisa.',
  },
  {
    icone: 'fa-book-open',
    titulo: 'Área do conhecimento',
    texto: 'Selecione a área que melhor representa o tema da campanha.',
  },
  {
    icone: 'fa-file-invoice-dollar',
    titulo: 'Proposta e orçamento',
    texto: 'Explique o objetivo da pesquisa e detalhe como os recursos solicitados serão utilizados.',
  },
  {
    icone: 'fa-calendar-days',
    titulo: 'Planejamento',
    texto: 'Apresente o período da campanha e as etapas previstas para o projeto.',
  },
] as const;

const DUVIDAS = [
  {
    pergunta: 'Como conheço uma campanha?',
    resposta:
      'A página da campanha reúne a proposta, o orçamento, o cronograma e as informações públicas do pesquisador.',
  },
  {
    pergunta: 'Preciso criar uma conta para apoiar?',
    resposta:
      'As formas de apoio disponíveis dependem da campanha e aparecem no checkout antes da confirmação.',
  },
  {
    pergunta: 'O que acontece se a campanha não atingir a meta?',
    resposta:
      'O resultado depende do modelo de financiamento informado na campanha. Consulte essa informação antes de apoiar.',
  },
  {
    pergunta: 'Como acompanho o andamento do projeto?',
    resposta:
      'As atualizações publicadas pelo pesquisador podem ser consultadas na página da campanha.',
  },
  {
    pergunta: 'Quais são as taxas e tarifas?',
    resposta:
      'As taxas e os valores aplicáveis são informados na página da campanha e no checkout antes da confirmação do apoio.',
  },
] as const;

const ABAS = [
  { chave: 'apoiar', rotulo: 'Quero apoiar' },
  { chave: 'pesquisador', rotulo: 'Sou pesquisador' },
  { chave: 'instituicao', rotulo: 'Sou instituição' },
] as const;

function ConteudoAba({ ativa }: { ativa: (typeof ABAS)[number]['chave'] }) {
  if (ativa === 'apoiar') {
    return (
      <>
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ETAPAS_APOIO.map((etapa) => (
            <article key={etapa.numero} className="pagina-publica__cartao pagina-publica__etapa">
              <div className="mb-3 flex items-center gap-3">
                <span className="pagina-publica__indice">{etapa.numero}</span>
                <h3 className="subtitulo">{etapa.titulo}</h3>
              </div>
              <p className="paragrafo texto-padrao">{etapa.texto}</p>
            </article>
          ))}
        </div>

        <h3 className="subtitulo mb-4">Tudo ou Nada e Flexível</h3>
        <div className="pagina-publica__tabela overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th scope="col">Critério</th>
                <th scope="col">Tudo ou Nada</th>
                <th scope="col">Flexível</th>
              </tr>
            </thead>
            <tbody>
              {MODELOS.map((linha) => (
                <tr key={linha.criterio}>
                  <th scope="row">{linha.criterio}</th>
                  <td>{linha.tudoOuNada}</td>
                  <td>{linha.flexivel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="paragrafo texto-padrao mt-4">
          As condições específicas e os valores aplicáveis são apresentados na própria campanha e no checkout.
        </p>
      </>
    );
  }

  if (ativa === 'pesquisador') {
    return (
      <>
        <p className="paragrafo texto-padrao mb-6">
          Prepare as informações do perfil e da campanha. As propostas enviadas passam pelo fluxo de avaliação da plataforma.
        </p>
        <div className="mb-8 flex flex-col gap-4">
          {REQUISITOS_PESQUISADOR.map((requisito) => (
            <article key={requisito.titulo} className="pagina-publica__cartao flex items-start gap-4">
              <span className="pagina-publica__perfil-icone shrink-0" aria-hidden="true">
                <i className={`fa-solid ${requisito.icone}`} />
              </span>
              <div>
                <h3 className="subtitulo mb-2">{requisito.titulo}</h3>
                <p className="paragrafo texto-padrao">{requisito.texto}</p>
              </div>
            </article>
          ))}
        </div>
        <Link to="/cadastro" className="btn btn-primary">
          Criar uma conta
        </Link>
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <article className="pagina-publica__cartao">
        <h3 className="subtitulo mb-2">Consulte as pesquisas</h3>
        <p className="paragrafo texto-padrao">
          As campanhas públicas apresentam informações do projeto e do pesquisador responsável.
        </p>
      </article>
      <article className="pagina-publica__cartao">
        <h3 className="subtitulo mb-2">Acompanhe as atualizações</h3>
        <p className="paragrafo texto-padrao">
          Novidades e resultados publicados podem ser consultados na página de cada campanha.
        </p>
      </article>
      <Link to="/explorar" className="btn btn-primary w-fit">
        Explorar campanhas
      </Link>
    </div>
  );
}

export function ComoFunciona() {
  const [abaAtiva, setAbaAtiva] = useState<(typeof ABAS)[number]['chave']>('apoiar');

  return (
    <div className="pagina-publica fundo-pagina min-h-full py-16">
      <div className="mx-auto max-w-6xl px-4">
        <CabecalhoPagina
          className="mb-14"
          descricao="O CrowdAcadêmico aproxima projetos de pesquisa e pessoas interessadas em conhecê-los e apoiá-los."
          titulo="Como funciona"
        />

        <section aria-labelledby="como-funciona-perfis" className="mb-16">
          <h2 id="como-funciona-perfis" className="titulo-secao mb-8 text-center">
            Três perfis, uma experiência adaptada
          </h2>
          <div className="flex flex-col gap-8">
            {PERFIS.map((perfil, indice) => (
              <div
                key={perfil.chave}
                className={`perfil-vitrine ${indice % 2 === 1 ? 'perfil-vitrine--invertido' : ''}`}
              >
                <div className="perfil-vitrine__painel" aria-hidden="true">
                  <div className="grade-medicao" />
                  <span className="perfil-vitrine__chip">
                    <i className={`fa-solid ${perfil.icone}`} />
                    {perfil.titulo}
                  </span>
                  <div className={`perfil-vitrine__mockup perfil-vitrine__mockup--${perfil.chave}`}>
                    <span className="perfil-vitrine__mockup-cabecalho" />
                    <div className="perfil-vitrine__mockup-linhas">
                      <span className="perfil-vitrine__mockup-linha">
                        <i />
                        <span><b /><b /></span>
                        <em />
                      </span>
                      <span className="perfil-vitrine__mockup-linha">
                        <i />
                        <span><b /><b /></span>
                        <em />
                      </span>
                      <span className="perfil-vitrine__mockup-linha">
                        <i />
                        <span><b /><b /></span>
                        <em />
                      </span>
                    </div>
                    <div className="perfil-vitrine__mockup-indicadores">
                      {Array.from(
                        { length: perfil.chave === 'pesquisador' ? 4 : 3 },
                        (_, indicador) => <span key={indicador} />,
                      )}
                    </div>
                  </div>
                </div>
                <div className="perfil-vitrine__conteudo">
                  <p className="rotulo-leitura texto-marca mb-2">
                    Perfil {String(indice + 1).padStart(2, '0')} de {PERFIS.length}
                  </p>
                  <h3 className="titulo-secao mb-0">
                    {perfil.chamada.split(perfil.destaque)[0]}
                    <span className="texto-marca">{perfil.destaque}</span>
                    {perfil.chamada.split(perfil.destaque)[1]}
                  </h3>
                  <ul className="perfil-vitrine__lista">
                    {perfil.pontos.map((ponto) => (
                      <li key={ponto}>
                        <span className="perfil-vitrine__icone" aria-hidden="true">
                          <i className="fa-solid fa-check" />
                        </span>
                        <span className="paragrafo texto-padrao">{ponto}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Informações por perfil" className="mb-16">
          <div className="pagina-publica__abas mb-8" role="tablist" aria-label="Escolha seu perfil">
            {ABAS.map((aba) => (
              <button
                key={aba.chave}
                type="button"
                role="tab"
                id={`como-funciona-aba-${aba.chave}`}
                aria-selected={abaAtiva === aba.chave}
                aria-controls="como-funciona-conteudo-aba"
                className={abaAtiva === aba.chave ? 'pagina-publica__aba pagina-publica__aba--ativa' : 'pagina-publica__aba'}
                onClick={() => setAbaAtiva(aba.chave)}
              >
                {aba.rotulo}
              </button>
            ))}
          </div>
          <div
            id="como-funciona-conteudo-aba"
            role="tabpanel"
            aria-labelledby={`como-funciona-aba-${abaAtiva}`}
            className="mb-16"
          >
            <ConteudoAba ativa={abaAtiva} />
          </div>
        </section>

        <section aria-labelledby="perguntas-frequentes">
          <h2 id="perguntas-frequentes" className="titulo-secao mb-6">
            Perguntas frequentes
          </h2>
          <div className="flex flex-col gap-3">
            {DUVIDAS.map((duvida) => (
              <details key={duvida.pergunta} className="pagina-publica__faq">
                <summary>{duvida.pergunta}</summary>
                <p className="paragrafo texto-padrao mt-3">{duvida.resposta}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
