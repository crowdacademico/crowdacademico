import { useState } from 'react';
import type { ReactNode } from 'react';
import { AcaoLinha } from '../acao-linha';
import { ModalDetalhe } from '../modal-detalhe';
import type { SecaoModalDetalhe } from '../modal-detalhe';

// Base das tabelas com edição na própria linha (links acadêmicos, itens de orçamento, marcos de cronograma):
// cada linha mostra Alterar/Consultar/Excluir; Alterar troca a linha por campos com Salvar/Cancelar; a última
// linha adiciona um registro novo; Consultar abre um ModalDetalhe. A tabela só mostra e edita: quem busca e
// salva os dados é quem usa a tabela (`aoAdicionar`/`aoSalvar`/`aoExcluir`).

export interface ColunaEditavel<T, F> {
  rotulo: string;
  centralizada?: boolean;
  exibir: (linha: T) => ReactNode;
  // Campo usado na linha em edição e na linha de adicionar. `editavel: false`: a coluna só aparece no adicionar;
  // na linha em edição continua mostrando o valor (ex.: o tipo de um link, que não muda depois de criado).
  campo: (form: F, mudar: (parcial: Partial<F>) => void) => ReactNode;
  editavel?: boolean;
}

export interface ConsultaLinha {
  titulo: string;
  secoes: SecaoModalDetalhe[];
}

interface TabelaEditavelProps<T, F> {
  linhas: T[];
  chave: (linha: T) => number;
  colunas: ColunaEditavel<T, F>[];
  formVazio: F;
  paraForm: (linha: T) => F;
  consultar: (linha: T) => ConsultaLinha;
  // Devolvem `true` quando deu certo: só então a linha de adicionar se limpa / a edição fecha.
  aoAdicionar: (form: F) => Promise<boolean>;
  aoSalvar: (linha: T, form: F) => Promise<boolean>;
  aoExcluir: (linha: T) => void;
  podeEditar?: boolean;
  podeAdicionar?: boolean;
  classeWrapper?: string;
}

const classeCelula = (centralizada?: boolean) => (centralizada ? 'crud-tabela__celula--centralizada' : undefined);

export function TabelaEditavel<T, F>({
  linhas,
  chave,
  colunas,
  formVazio,
  paraForm,
  consultar,
  aoAdicionar,
  aoSalvar,
  aoExcluir,
  podeEditar = true,
  podeAdicionar = podeEditar,
  classeWrapper = 'crud-tabela__wrapper',
}: TabelaEditavelProps<T, F>) {
  const [novo, setNovo] = useState<F>(formVazio);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [edicao, setEdicao] = useState<F>(formVazio);
  const [consultada, setConsultada] = useState<T | null>(null);

  const mudarNovo = (parcial: Partial<F>) => setNovo((atual) => ({ ...atual, ...parcial }));
  const mudarEdicao = (parcial: Partial<F>) => setEdicao((atual) => ({ ...atual, ...parcial }));

  const adicionar = async () => {
    if (await aoAdicionar(novo)) {
      setNovo(formVazio);
    }
  };

  const salvar = async (linha: T) => {
    if (await aoSalvar(linha, edicao)) {
      setIdEditando(null);
    }
  };

  const consulta = consultada ? consultar(consultada) : null;

  return (
    <>
      <div className={classeWrapper}>
        <table className="crud-tabela mb-3">
          <thead>
            <tr>
              {colunas.map((coluna) => (
                <th key={coluna.rotulo} className={classeCelula(coluna.centralizada)}>
                  {coluna.rotulo}
                </th>
              ))}
              {podeEditar && <th className="crud-tabela__celula--centralizada">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => {
              const emEdicao = idEditando === chave(linha);
              return (
                <tr key={chave(linha)}>
                  {colunas.map((coluna) => (
                    <td key={coluna.rotulo} className={classeCelula(coluna.centralizada)} data-rotulo={coluna.rotulo}>
                      {emEdicao && coluna.editavel !== false ? coluna.campo(edicao, mudarEdicao) : coluna.exibir(linha)}
                    </td>
                  ))}
                  {podeEditar && (
                    <td className="crud-tabela__celula--centralizada">
                      <div className="crud-tabela__acoes">
                        {emEdicao ? (
                          <>
                            <AcaoLinha rotulo="Salvar" icone="fa-check" variante="escolher" onClick={() => void salvar(linha)} />
                            <AcaoLinha rotulo="Cancelar" icone="fa-xmark" onClick={() => setIdEditando(null)} />
                          </>
                        ) : (
                          <>
                            <AcaoLinha
                              rotulo="Alterar"
                              icone="fa-pen"
                              variante="alterar"
                              onClick={() => {
                                setIdEditando(chave(linha));
                                setEdicao(paraForm(linha));
                              }}
                            />
                            <AcaoLinha rotulo="Consultar" icone="fa-eye" onClick={() => setConsultada(linha)} />
                            <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => aoExcluir(linha)} />
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {podeAdicionar && (
              <tr>
                {colunas.map((coluna) => (
                  <td key={coluna.rotulo} data-rotulo={coluna.rotulo}>
                    {coluna.campo(novo, mudarNovo)}
                  </td>
                ))}
                <td className="crud-tabela__celula--centralizada">
                  <button type="button" className="btn btn-sucesso text-xs whitespace-nowrap" onClick={() => void adicionar()}>
                    + adicionar
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {consulta && (
        <ModalDetalhe rotuloAcao="Consultar" titulo={consulta.titulo} secoes={consulta.secoes} aoFechar={() => setConsultada(null)} />
      )}
    </>
  );
}
