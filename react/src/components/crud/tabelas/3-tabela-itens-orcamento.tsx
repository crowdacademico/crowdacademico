import { TabelaEditavel } from './tabela-editavel';
import type { ColunaEditavel } from './tabela-editavel';
import { formatarMoeda } from '../../../services/constant/utils/formatacao.util';
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
      <input type="text" placeholder="Categoria" value={form.categoria} onChange={(evento) => mudar({ categoria: evento.target.value })} className="input-padrao" />
    ),
  },
  {
    rotulo: 'Valor',
    exibir: (item) => formatarMoeda(item.valor),
    campo: (form, mudar) => (
      <input type="number" placeholder="Valor" value={form.valor} onChange={(evento) => mudar({ valor: evento.target.value })} className="input-padrao" />
    ),
  },
];

interface TabelaItensOrcamentoProps {
  itens: OrcamentoCampanhaResponse[];
  podeEditar: boolean;
  // Quando presente, mostra Meta e Soma atual acima da tabela; a Soma fica em vermelho se não bater com a meta
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
        <table className="crud-tabela mb-3">
          <tbody>
            <tr>
              <td>Meta</td>
              <td>
                <input type="text" readOnly value={formatarMoeda(metaFinanceira)} className="input-padrao" />
              </td>
            </tr>
            <tr>
              <td>Soma atual</td>
              <td>
                <input type="text" readOnly value={formatarMoeda(soma)} className={'input-padrao' + (soma === metaFinanceira ? '' : ' borda-erro')} />
              </td>
            </tr>
          </tbody>
        </table>
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
