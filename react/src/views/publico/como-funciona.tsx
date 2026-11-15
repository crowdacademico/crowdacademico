import { useState } from 'react';
import { Link } from 'react-router';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';

// Como funciona (15-11-2026): explica a PLATAFORMA (ciclo da campanha, apoio, pesquisador, curadoria, modelos).
// "Sobre" ficou com a identidade do projeto; "Taxas e transparência" com os números e o simulador. Prazos, limites e
// valores vêm das configurações públicas (as mesmas que o banco usa); os números abaixo só valem enquanto elas carregam.
// A seção dos três perfis (PERFIS) é a original, sem alteração.

const PERFIS = [
  {
    chave: 'visitante',
    imagem: '/imagens/perfil-visitante.webp',
    descricaoImagem: 'Ilustração de uma jovem explorando um museu de ciências.',
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
    imagem: '/imagens/perfil-apoiador.webp',
    descricaoImagem: 'Ilustração de uma pessoa comemorando no celular o apoio a um projeto.',
    titulo: 'Cadastre-se',
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
    imagem: '/imagens/perfil-pesquisador.webp',
    descricaoImagem: 'Ilustração de uma cientista sorrindo em sua mesa, com gráficos, microscópio e vidrarias de laboratório.',
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

const VISAO_GERAL = [
  {
    numero: 1,
    titulo: 'O pesquisador monta a proposta',
    texto: 'Descreve o projeto, detalha o orçamento, define o cronograma e escolhe o modelo de financiamento.',
  },
  {
    numero: 2,
    titulo: 'A curadoria avalia',
    texto: 'A proposta só se torna pública depois de aprovada. Se for rejeitada, o pesquisador recebe a justificativa.',
  },
  {
    numero: 3,
    titulo: 'A campanha recebe apoios',
    texto: 'Qualquer pessoa pode apoiar, com Pix e, em campanhas flexíveis, também com cartão. O pesquisador publica atualizações.',
  },
  {
    numero: 4,
    titulo: 'Repasse ou devolução',
    texto: 'No fim do prazo, o sistema decide sozinho: o valor vai para o pesquisador ou volta para quem apoiou.',
  },
] as const;

const ABAS = [
  { chave: 'apoiar', rotulo: 'Quero apoiar' },
  { chave: 'pesquisador', rotulo: 'Sou pesquisador' },
] as const;

type ChaveAba = (typeof ABAS)[number]['chave'];

function CartaoPasso({ numero, titulo, texto }: { numero: number; titulo: string; texto: React.ReactNode }) {
  return (
    <article className="pagina-publica__cartao pagina-publica__etapa">
      <div className="mb-3 flex items-center gap-3">
        <span className="pagina-publica__indice">{numero}</span>
        <h3 className="subtitulo">{titulo}</h3>
      </div>
      <p className="paragrafo texto-padrao">{texto}</p>
    </article>
  );
}

function AbaApoiar() {
  const { obterNumero, obterConfiguracao } = useConfiguracoes();
  const valorMinimo = obterNumero('valor_minimo_contribuicao', 5);
  const cartaoMinimo = obterNumero('valor_minimo_contribuicao_cartao', 20);
  const cartaoMaximo = obterNumero('valor_maximo_contribuicao_cartao', 500);
  const cartaoHabilitado = obterConfiguracao('cartao_habilitado', true) !== false;
  const carenciaRepasse = obterNumero('repasse_carencia_dias', 15);
  const prazoDesistencia = obterNumero('desistencia_prazo_dias', 7);

  const linhasModelos = [
    {
      criterio: 'Como funciona',
      tudoOuNada: 'A pesquisa depende de um valor mínimo. Só há repasse se a meta for atingida.',
      flexivel: 'O projeto pode avançar mesmo sem a meta total. O pesquisador recebe o que for arrecadado.',
    },
    {
      criterio: 'Se a meta for atingida',
      tudoOuNada: `O valor arrecadado vai para o pesquisador, descontada a taxa da plataforma, após ${carenciaRepasse} dias de carência.`,
      flexivel: `O valor arrecadado vai para o pesquisador, descontada a taxa da plataforma, após ${carenciaRepasse} dias de carência.`,
    },
    {
      criterio: 'Se a meta não for atingida',
      tudoOuNada: 'Todos os apoios são devolvidos automaticamente.',
      flexivel: `O pesquisador recebe o que foi arrecadado, descontada a taxa, após ${carenciaRepasse} dias de carência.`,
    },
    {
      criterio: 'Formas de pagamento',
      tudoOuNada: 'Somente Pix.',
      flexivel: cartaoHabilitado ? 'Pix e cartão de crédito (o cartão exige conta).' : 'Pix.',
    },
    {
      criterio: 'Antes de apoiar',
      tudoOuNada: 'A campanha informa que o valor só segue para a pesquisa se a meta for atingida.',
      flexivel: 'Você confirma que entendeu que o valor será repassado mesmo sem a meta.',
    },
  ];

  return (
    <>
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoPasso
          numero={1}
          titulo="Escolha um projeto"
          texto="Explore as campanhas e leia a proposta, o orçamento, o cronograma e o perfil do pesquisador responsável."
        />
        <CartaoPasso
          numero={2}
          titulo="Apoie"
          texto={`Na página da campanha, clique em Apoiar, escolha o valor (a partir de ${formatarMoeda(valorMinimo)}) e pague o Pix na página do provedor de pagamento. Não é preciso ter conta para apoiar com Pix.`}
        />
        <CartaoPasso
          numero={3}
          titulo="Acompanhe a pesquisa"
          texto="Com conta, você segue a campanha ou o pesquisador e recebe um aviso a cada atualização publicada."
        />
        <CartaoPasso
          numero={4}
          titulo="Veja o resultado"
          texto="No encerramento, o valor segue para o pesquisador ou é devolvido, conforme o modelo da campanha. Tudo é automático."
        />
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
            {linhasModelos.map((linha) => (
              <tr key={linha.criterio}>
                <th scope="row">{linha.criterio}</th>
                <td>{linha.tudoOuNada}</td>
                <td>{linha.flexivel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="legenda mt-4 texto-fraco">
        Se uma campanha for encerrada pela moderação, os valores são devolvidos em qualquer um dos modelos.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article className="pagina-publica__cartao">
          <h3 className="subtitulo mb-2">Posso desistir?</h3>
          <p className="paragrafo texto-padrao">
            Sim, em até {prazoDesistencia} dias depois de apoiar. O valor volta pelo mesmo meio de pagamento; a tarifa do
            meio de pagamento não volta.
          </p>
        </article>
        <article className="pagina-publica__cartao">
          <h3 className="subtitulo mb-2">Quanto custa apoiar?</h3>
          <p className="paragrafo texto-padrao">
            O valor do apoio chega ao projeto. A tarifa do meio de pagamento é somada ao que você paga
            {cartaoHabilitado
              ? ` (o cartão vale de ${formatarMoeda(cartaoMinimo)} a ${formatarMoeda(cartaoMaximo)})`
              : ''}
            . Veja os valores e simule em{' '}
            <Link to="/transparencia" className="texto-marca underline">
              Taxas e transparência
            </Link>
            .
          </p>
        </article>
      </div>
    </>
  );
}

function AbaPesquisador() {
  const { obterNumero } = useConfiguracoes();
  const prazoMinimo = obterNumero('prazo_minimo_campanha_dias', 15);
  const prazoMaximo = obterNumero('prazo_maximo_campanha_dias', 60);
  const prazoSugerido = obterNumero('prazo_sugerido_campanha_dias', 30);
  const limiteSimultaneas = obterNumero('limite_campanhas_simultaneas', 2);
  const minimoItens = obterNumero('orcamento_min_itens', 1);
  const minimoMarcos = obterNumero('cronograma_min_marcos', 3);
  const diasRascunho = Math.round(obterNumero('campanha_rascunho_ttl_horas', 336) / 24);
  const taxaPlataforma = obterNumero('taxa_plataforma_padrao', 5);
  const carenciaRepasse = obterNumero('repasse_carencia_dias', 15);

  const passos = [
    {
      titulo: 'Complete o perfil de pesquisador',
      texto:
        'A partir da sua conta, informe CPF, título acadêmico, vínculo (institucional ou independente) e links como Lattes ou ORCID. Cadastre também a chave Pix que vai receber o repasse e aceite o Termo de Pesquisador. A campanha fica sempre no nome de uma pessoa física, mesmo que o projeto seja de um grupo ou laboratório.',
    },
    {
      titulo: 'Monte a campanha em rascunho',
      texto: `Escolha a área do conhecimento (classificação do CNPq), a meta e o modelo. Detalhe o orçamento, cuja soma precisa ser exatamente a meta (mínimo de ${minimoItens} ${minimoItens === 1 ? 'item' : 'itens'}), e o cronograma (mínimo de ${minimoMarcos} marcos). A duração vai de ${prazoMinimo} a ${prazoMaximo} dias, com ${prazoSugerido} dias sugeridos. Um rascunho não enviado é apagado após ${diasRascunho} dias.`,
    },
    {
      titulo: 'Envie para a curadoria',
      texto: `Você pode ter até ${limiteSimultaneas} campanhas ao mesmo tempo, entre ativas e aguardando aprovação. A seção sobre curadoria, mais abaixo, mostra o que é avaliado.`,
    },
    {
      titulo: 'Campanha aprovada',
      texto:
        'A campanha fica pública, ou aparece como "Em breve" se o início foi agendado. A partir daí, título, descrição, meta, modelo, taxa e orçamento ficam congelados para preservar o que foi prometido a quem apoia. As datas e os marcos ainda podem mudar enquanto a campanha estiver em "Em breve".',
    },
    {
      titulo: 'Publique atualizações',
      texto:
        'Durante e depois da campanha, conte como a pesquisa avança, com texto, imagem, PDF ou link. Quem segue a campanha é avisado por e-mail, e a regularidade das atualizações conta para a sua reputação.',
    },
    {
      titulo: 'Encerramento e repasse',
      texto: `A campanha encerra automaticamente no fim do prazo. O valor é enviado por Pix para a chave cadastrada, descontada a taxa da plataforma (${taxaPlataforma}%, fixada na aprovação), após ${carenciaRepasse} dias de carência. Para encerrar antes, uma campanha sem apoios pode ser encerrada direto; com apoios, o pedido passa pela análise de um administrador.`,
    },
  ];

  return (
    <>
      <p className="paragrafo texto-padrao mb-6">
        Esse é o caminho completo, da conta ao repasse. Prepare as informações do perfil e da campanha antes de começar:
        ajuda a passar pela curadoria de primeira.
      </p>
      <ol className="mb-8 flex flex-col gap-4">
        {passos.map((passo, indice) => (
          <li key={passo.titulo} className="pagina-publica__cartao flex items-start gap-4">
            <span className="pagina-publica__indice shrink-0">{indice + 1}</span>
            <div>
              <h3 className="subtitulo mb-2">{passo.titulo}</h3>
              <p className="paragrafo texto-padrao">{passo.texto}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link to="/cadastro" className="btn btn-primary">
        Criar uma conta
      </Link>
    </>
  );
}

export function ComoFunciona() {
  const [abaAtiva, setAbaAtiva] = useState<ChaveAba>('apoiar');

  return (
    <div className="pagina-publica fundo-pagina min-h-full py-16">
      <div className="mx-auto max-w-6xl px-4">
        <CabecalhoPagina
          className="mb-14"
          descricao="Do projeto à campanha publicada, do apoio ao resultado: veja como cada etapa funciona no CrowdAcadêmico."
          titulo="Como funciona"
        />

        <section aria-labelledby="como-funciona-visao" className="mb-16">
          <h2 id="como-funciona-visao" className="titulo-secao mb-8 text-center">
            A plataforma em quatro passos
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VISAO_GERAL.map((etapa) => (
              <CartaoPasso key={etapa.numero} numero={etapa.numero} titulo={etapa.titulo} texto={etapa.texto} />
            ))}
          </div>
        </section>

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
                {/* Ilustração de cada perfil (14-11-2026): WebP 1200x675, ~55 KB; originais em informacoes/Imagens. */}
                <div className="perfil-vitrine__painel">
                  <img
                    src={perfil.imagem}
                    alt={perfil.descricaoImagem}
                    width={1200}
                    height={675}
                    loading="lazy"
                    decoding="async"
                    className="perfil-vitrine__imagem"
                  />
                  <span className="perfil-vitrine__chip">
                    <i className={`fa-solid ${perfil.icone}`} aria-hidden="true" />
                    {perfil.titulo}
                  </span>
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

        <section aria-label="Detalhes por perfil" className="mb-16">
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
          >
            {abaAtiva === 'apoiar' ? <AbaApoiar /> : <AbaPesquisador />}
          </div>
        </section>

        <section aria-labelledby="como-funciona-confianca" className="mb-16">
          <h2 id="como-funciona-confianca" className="titulo-secao mb-2">
            Como cuidamos da confiança
          </h2>
          <p className="paragrafo texto-padrao mb-6">
            Financiar pesquisa exige saber em quem confiar. Quatro mecanismos trabalham juntos para isso.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <article className="pagina-publica__cartao" id="curadoria">
              <h3 className="subtitulo mb-2">Curadoria antes da publicação</h3>
              <p className="paragrafo texto-padrao">
                Nenhuma campanha vai ao ar sem aprovação. A curadoria confere se a proposta, o orçamento e o prazo são
                coerentes entre si, se o orçamento soma exatamente a meta e se o cronograma e as informações exigidas
                estão completos. A decisão, aprovando ou rejeitando, vem sempre com justificativa, e o pesquisador pode
                ajustar a proposta e reenviar. A curadoria verifica a consistência do projeto, mas não garante o
                resultado da pesquisa.
              </p>
            </article>
            <article className="pagina-publica__cartao">
              <h3 className="subtitulo mb-2">Reputação do pesquisador</h3>
              <p className="paragrafo texto-padrao">
                Cada pesquisador tem uma pontuação pública de 0 a 100, calculada automaticamente a partir do perfil
                acadêmico, do histórico de campanhas, da regularidade das atualizações e das denúncias julgadas
                procedentes. A pontuação nunca bloqueia ninguém: serve de sinal para a curadoria e de referência para
                quem apoia.
              </p>
            </article>
            <article className="pagina-publica__cartao">
              <h3 className="subtitulo mb-2">Endosso entre pares</h3>
              <p className="paragrafo texto-padrao">
                Pesquisadores cadastrados podem comentar a campanha de um colega. O responsável pela campanha escolhe
                alguns comentários para endossar, e só esses aparecem publicamente, com o nome e o vínculo de quem
                escreveu.
              </p>
            </article>
            <article className="pagina-publica__cartao">
              <h3 className="subtitulo mb-2">Moderação e denúncias</h3>
              <p className="paragrafo texto-padrao">
                Quem tem conta pode denunciar uma campanha ou um perfil. A moderação analisa cada caso e aplica as
                medidas previstas. O pesquisador pode contestar uma denúncia julgada procedente, e a contestação é
                decidida por outra pessoa. Campanhas encerradas pela moderação têm os valores devolvidos.
              </p>
            </article>
          </div>
        </section>

        <section aria-label="Continue conhecendo" className="pagina-publica__cartao">
          <h2 className="subtitulo mb-2">Ainda com dúvida?</h2>
          <p className="paragrafo texto-padrao mb-5">
            Veja quanto custa cada meio de pagamento e a taxa da plataforma, ou confira as respostas mais comuns.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/transparencia" className="btn btn-primary">
              Taxas e transparência
            </Link>
            <Link to="/perguntas-frequentes" className="btn">
              Perguntas frequentes
            </Link>
            <Link to="/explorar" className="texto-marca font-bold hover:underline">
              Explorar campanhas
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}