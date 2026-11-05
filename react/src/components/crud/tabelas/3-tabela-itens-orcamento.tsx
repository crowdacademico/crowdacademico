import { TabelaEditavel } from './tabela-editavel';
import type { ColunaEditavel } from './tabela-editavel';
import { InputDinheiro } from '../../input/input-dinheiro';
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
      <InputDinheiro aria-label="Valor do item" placeholder="Valor" valor={form.valor} aoMudar={(valor) => mudar({ valor })} />
    ),
  },
];

interface TabelaItensOrcamentoProps {
  itens: OrcamentoCampanhaResponse[];
  podeEditar: boolean;
  aoAdicionar: (dados: DadosItemOrcamento) => Promise<boolean>;
  aoSalvar: (item: OrcamentoCampanhaResponse, dados: DadosItemOrcamento) => Promise<boolean>;
  aoExcluir: (item: OrcamentoCampanhaResponse) => void;
}

export function TabelaItensOrcamento({ itens, podeEditar, aoAdicionar, aoSalvar, aoExcluir }: TabelaItensOrcamentoProps) {
  return (
    <>
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
      />
    </>
  );
}
