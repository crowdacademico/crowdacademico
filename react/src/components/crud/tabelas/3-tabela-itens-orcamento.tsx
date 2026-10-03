import { TabelaEditavel } from './tabela-editavel';
import type { ColunaEditavel } from './tabela-editavel';
import { BarraProgresso } from '../barra-progresso';
import { formatarMoeda } from '../../../services/constant/util/formatacao.util';
import type { OrcamentoCampanhaResponse } from '../../../services/13-orcamento-campanha/type/orcamento-campanha.type';

// Itens de orçamento de uma campanha (categoria e valor), com edição na linha. Usada pelo painel de Orçamento e
// Cronograma (views/12-campanha/painel-orcamento-cronograma.tsx), que busca e salva.

export interface DadosItemOrcamento {
  categoria: string;
  valor: number;
}

interface FormItem {
  categoria: string;
  valor: string;
}

const FORM_VAZIO: FormItem = { categoria: '', valor: '' };

const paraDados = (form: FormItem): DadosItemOrcamento | null =>
  form.categoria && form.valor ? { categoria: form.categoria, valor: Number(form.valor) } : null;

const COLUNAS: ColunaEditavel<OrcamentoCampanhaResponse, FormItem>[] = [
  {
    rotulo: 'Categoria',
    exibir: (item) => item.categoria,
    campo: (form, mudar) => (
      <input type="text" aria-label="Categoria do item" placeholder="Categoria" value={form.categoria} onChange={(evento) => mudar({ categoria: evento.target.value })} className="input-padrao" />
    ),
  },
  {
    rotulo: 'Valor',
    exibir: (item) => formatarMoeda(item.valor),
    campo: (form, mudar) => (
      <input type="number" aria-label="Valor do item" placeholder="Valor" value={form.valor} onChange={(evento) => mudar({ valor: evento.target.value })} className="input-padrao" />
    ),
  },
];

interface TabelaItensOrcamentoProps {
  itens: OrcamentoCampanhaResponse[];
  podeEditar: boolean;
  // Quando presente, mostra acima da tabela o total dos itens em relação à meta, com a barra; em vermelho se não bater
  // (o banco exige a igualdade exata na aprovação, RF-039/040; isto só adianta o aviso).
  metaFinanceira?: number;
  aoAdicionar: (dados: DadosItemOrcamento) => Promise<boolean>;
  aoSalvar: (item: OrcamentoCampanhaResponse, dados: DadosItemOrcamento) => Promise<boolean>;
  aoExcluir: (item: OrcamentoCampanhaResponse) => void;
}

export function TabelaItensOrcamento({ itens, podeEditar, metaFinanceira, aoAdicionar, aoSalvar, aoExcluir }: TabelaItensOrcamentoProps) {
  const soma = itens.reduce((total, item) => total + item.valor, 0);

  return (
    <>
      {metaFinanceira !== undefined && (
        <div className="paragrafo flex flex-wrap items-center justify-between gap-3 mb-3 texto-herdado">
          <span className={soma === metaFinanceira ? 'texto-fraco' : 'texto-erro enfase'}>
            Total dos itens: <strong>{formatarMoeda(soma)}</strong> de {formatarMoeda(metaFinanceira)}
            {soma !== metaFinanceira && ' (precisa ser igual à meta)'}
          </span>
          <BarraProgresso valor={soma} total={metaFinanceira} rotulo="Total do orçamento em relação à meta" />
        </div>
      )}
      <TabelaEditavel
        linhas={itens}
        chave={(item) => item.idOrcamento}
        colunas={COLUNAS}
        formVazio={FORM_VAZIO}
        paraForm={(item) => ({ categoria: item.categoria, valor: String(item.valor) })}
        podeEditar={podeEditar}
        aoAdicionar={(form) => {
          const dados = paraDados(form);
          return dados ? aoAdicionar(dados) : Promise.resolve(false);
        }}
        aoSalvar={(item, form) => {
          const dados = paraDados(form);
          return dados ? aoSalvar(item, dados) : Promise.resolve(false);
        }}
        aoExcluir={aoExcluir}
        consultar={(item) => ({
          titulo: 'Item de orçamento',
          secoes: [
            { titulo: 'Categoria', conteudo: item.categoria },
            { titulo: 'Valor', conteudo: formatarMoeda(item.valor) },
          ],
        })}
      />
    </>
  );
}
