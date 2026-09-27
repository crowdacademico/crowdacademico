import { TabelaEditavel } from './tabela-editavel';
import type { ColunaEditavel } from './tabela-editavel';
import { formatarData } from '../../../services/constant/utils/formatacao.util';
import type { MarcoCronogramaResponse } from '../../../services/14-marco-cronograma/type/marco-cronograma.type';

// Marcos do cronograma de uma campanha (título e data prevista), com edição na linha. Usada pelo painel de
// Orçamento e Cronograma (views/12-campanha/painel-orcamento-cronograma.tsx), que busca e salva.

export interface DadosMarco {
  titulo: string;
  dataPrevista: string;
}

interface FormMarco {
  titulo: string;
  dataPrevista: string;
}

const FORM_VAZIO: FormMarco = { titulo: '', dataPrevista: '' };


const paraDados = (form: FormMarco): DadosMarco | null =>
  form.titulo && form.dataPrevista ? { titulo: form.titulo, dataPrevista: new Date(form.dataPrevista).toISOString() } : null;

interface TabelaMarcosCronogramaProps {
  marcos: MarcoCronogramaResponse[];
  podeEditar: boolean;
  // `min` da data prevista. Só mínimo, de propósito: RF-042/fn_valida_data_marco_cronograma barram data anterior
  // ao início, mas permitem passar do fim (a divulgação de resultado costuma vir depois do prazo).
  dataInicioCampanha?: string;
  // Quando presente, mostra Mínimo de marcos e Marcos cadastrados acima da tabela, em vermelho se faltar.
  minimoMarcos?: number;
  aoAdicionar: (dados: DadosMarco) => Promise<boolean>;
  aoSalvar: (marco: MarcoCronogramaResponse, dados: DadosMarco) => Promise<boolean>;
  aoExcluir: (marco: MarcoCronogramaResponse) => void;
}

export function TabelaMarcosCronograma({
  marcos,
  podeEditar,
  dataInicioCampanha,
  minimoMarcos,
  aoAdicionar,
  aoSalvar,
  aoExcluir,
}: TabelaMarcosCronogramaProps) {
  const colunas: ColunaEditavel<MarcoCronogramaResponse, FormMarco>[] = [
    {
      rotulo: 'Título',
      exibir: (marco) => marco.titulo,
      campo: (form, mudar) => (
        <input type="text" placeholder="Título" value={form.titulo} onChange={(evento) => mudar({ titulo: evento.target.value })} className="input-padrao" />
      ),
    },
    {
      rotulo: 'Data prevista',
      exibir: (marco) => formatarData(marco.dataPrevista),
      campo: (form, mudar) => (
        <input
          type="date"
          value={form.dataPrevista}
          min={dataInicioCampanha}
          onChange={(evento) => mudar({ dataPrevista: evento.target.value })}
          className="input-padrao"
        />
      ),
    },
  ];

  return (
    <>
      {minimoMarcos !== undefined && (
        <table className="crud-tabela mb-3">
          <tbody>
            <tr>
              <td>Mínimo de marcos</td>
              <td>
                <input type="text" readOnly value={minimoMarcos} className="input-padrao" />
              </td>
            </tr>
            <tr>
              <td>Marcos cadastrados</td>
              <td>
                <input type="text" readOnly value={marcos.length} className={'input-padrao' + (marcos.length >= minimoMarcos ? '' : ' borda-erro')} />
              </td>
            </tr>
          </tbody>
        </table>
      )}
      <TabelaEditavel
        linhas={marcos}
        chave={(marco) => marco.idMarco}
        colunas={colunas}
        formVazio={FORM_VAZIO}
        paraForm={(marco) => ({ titulo: marco.titulo, dataPrevista: marco.dataPrevista.slice(0, 10) })}
        podeEditar={podeEditar}
        aoAdicionar={(form) => {
          const dados = paraDados(form);
          return dados ? aoAdicionar(dados) : Promise.resolve(false);
        }}
        aoSalvar={(marco, form) => {
          const dados = paraDados(form);
          return dados ? aoSalvar(marco, dados) : Promise.resolve(false);
        }}
        aoExcluir={aoExcluir}
        consultar={(marco) => ({
          titulo: 'Marco de cronograma',
          secoes: [
            { titulo: 'Título', conteudo: marco.titulo },
            { titulo: 'Data prevista', conteudo: formatarData(marco.dataPrevista) },
          ],
        })}
      />
    </>
  );
}
