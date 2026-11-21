import { useId, useState } from 'react';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';

// Ajuda das etapas Orçamento e Cronograma do Criar Campanha (21-11-2026, teste com usuários: a professora entendeu os
// Dados, que são da campanha, mas não o Orçamento e o Cronograma, que são do PROJETO de pesquisa). Padrão de mercado
// (Kickstarter e Catarse nas etapas de criação, "rich tooltip" do Material Design): uma frase fixa dizendo para que
// serve a etapa e um "Ver exemplo" que abre um exemplo pronto em miniatura. O exemplo é desenhado aqui mesmo (não é
// imagem): segue o tema claro/escuro e o tamanho de fonte da pessoa. É o mesmo projeto nas duas etapas, para a pessoa
// ver orçamento e cronograma da mesma pesquisa.

const EXEMPLO_ORCAMENTO = [
  { categoria: 'Viagens', descricao: 'Deslocamento entre as nascentes', valor: 4000 },
  { categoria: 'Material de campo', descricao: 'Frascos e sondas de medição', valor: 6000 },
  { categoria: 'Serviços de terceiros', descricao: 'Análises microbiológicas', valor: 10000 },
];
const META_EXEMPLO = EXEMPLO_ORCAMENTO.reduce((total, item) => total + item.valor, 0);

const EXEMPLO_CRONOGRAMA = [
  { titulo: 'Início do projeto', data: 'março de 2027' },
  { titulo: 'Coleta de água nas nascentes', data: 'maio de 2027' },
  { titulo: 'Análises no laboratório', data: 'agosto de 2027' },
  { titulo: 'Divulgação dos resultados', data: 'dezembro de 2027' },
];

const PROJETO_EXEMPLO = 'Qualidade da água das nascentes urbanas';

interface AjudaEtapaCampanhaProps {
  etapa: 'orcamento' | 'cronograma';
  // Meta já escolhida nos Dados: a soma do orçamento precisa fechar nela (fn_valida_completude_campanha).
  meta?: number;
  minimoMarcos?: number;
}

export function AjudaEtapaCampanha({ etapa, meta, minimoMarcos }: AjudaEtapaCampanhaProps) {
  const [aberto, setAberto] = useState(false);
  const idExemplo = useId();

  const explicacao =
    etapa === 'orcamento'
      ? `O orçamento é do seu projeto de pesquisa: mostra a quem apoia no que o dinheiro será gasto. Separe os gastos por categoria (o tipo de gasto) e dê um valor a cada uma.${meta ? ` A soma precisa fechar em ${formatarMoeda(meta)}, a meta da campanha.` : ' A soma precisa ser igual à meta da campanha.'}`
      : `O cronograma mostra as etapas do seu projeto e quando cada uma deve acontecer. Cada etapa é um marco: uma entrega que quem apoia pode acompanhar, como o início, a coleta de dados ou a divulgação dos resultados.${minimoMarcos ? ` São pelo menos ${minimoMarcos} marcos.` : ''}`;

  return (
    <div className="sm:col-span-2 mb-4">
      <p className="paragrafo texto-padrao">{explicacao}</p>
      <button
        type="button"
        className="btn btn-secondary btn-pequeno mt-3"
        aria-expanded={aberto}
        aria-controls={idExemplo}
        onClick={() => setAberto((atual) => !atual)}
      >
        <i className={'fa-solid ' + (aberto ? 'fa-chevron-up' : 'fa-lightbulb')} aria-hidden="true"></i>{' '}
        {aberto ? 'Esconder exemplo' : 'Ver exemplo'}
      </button>

      {aberto && (
        <figure id={idExemplo} className="exemplo-etapa mt-3">
          <figcaption className="legenda texto-fraco mb-2">
            <span className="badge badge-info mr-2">Exemplo</span>
            Projeto “{PROJETO_EXEMPLO}”
            {etapa === 'orcamento' && `, meta de ${formatarMoeda(META_EXEMPLO)}`}
          </figcaption>
          <table className="exemplo-etapa__tabela">
            {etapa === 'orcamento' ? (
              <>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th className="exemplo-etapa__numero">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {EXEMPLO_ORCAMENTO.map((item) => (
                    <tr key={item.categoria}>
                      <td>{item.categoria}</td>
                      <td>{item.descricao}</td>
                      <td className="exemplo-etapa__numero">{formatarMoeda(item.valor)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Soma (igual à meta)</td>
                    <td className="exemplo-etapa__numero">{formatarMoeda(META_EXEMPLO)}</td>
                  </tr>
                </tfoot>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Marco</th>
                    <th className="exemplo-etapa__numero">Data prevista</th>
                  </tr>
                </thead>
                <tbody>
                  {EXEMPLO_CRONOGRAMA.map((marco) => (
                    <tr key={marco.titulo}>
                      <td>{marco.titulo}</td>
                      <td className="exemplo-etapa__numero">{marco.data}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
          <p className="legenda texto-fraco mt-2">
            {etapa === 'orcamento'
              ? 'Na página da campanha, esses itens aparecem em “Orçamento do projeto”, num gráfico que acende conforme o dinheiro chega.'
              : 'Na página da campanha, os marcos viram uma linha do tempo, e as atualizações que você publicar mostram o andamento.'}
          </p>
        </figure>
      )}
    </div>
  );
}
