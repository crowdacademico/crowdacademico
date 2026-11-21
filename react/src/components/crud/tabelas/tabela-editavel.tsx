import { useState } from 'react';
import type { ReactNode } from 'react';
import { AcaoLinha } from '../acao-linha';
import { CabecalhoAcoes, CelulaAcoesLivre } from '../colunas/5-coluna-acoes';
import { Tooltip } from '../../layout/tooltip';

// Base das tabelas com edição na própria linha (links acadêmicos, itens de orçamento, marcos de cronograma):
// cada linha mostra Alterar/Excluir (sem Consultar: a linha já mostra tudo, e o texto longo tem "ler tudo"); Alterar
// troca a linha por campos com Salvar/Cancelar; a última linha adiciona um registro novo. A tabela só mostra e edita:
// quem busca e salva os dados é quem usa a tabela (`aoAdicionar`/`aoSalvar`/`aoExcluir`).

export interface ColunaEditavel<T, F> {
  rotulo: string;
  // Explicação com exemplos num ⓘ ao lado do nome da coluna (ex.: o que é a Categoria do orçamento).
  dica?: string;
  centralizada?: boolean;
  exibir: (linha: T) => ReactNode;
  // Campo usado na linha em edição e na linha de adicionar. `editavel: false`: a coluna só aparece no adicionar;
  // na linha em edição continua mostrando o valor (ex.: o tipo de um link, que não muda depois de criado).
  campo: (form: F, mudar: (parcial: Partial<F>) => void) => ReactNode;
  editavel?: boolean;
  // A coluna que fica com o espaço que sobra (o texto longo da tabela, ex.: a URL); as outras ficam só com o que o
  // conteúdo e os campos da linha de adicionar pedem.
  principal?: boolean;
}

interface TabelaEditavelProps<T, F> {
  linhas: T[];
  chave: (linha: T) => number;
  colunas: ColunaEditavel<T, F>[];
  formVazio: F;
  paraForm: (linha: T) => F;
  // Devolvem `true` quando deu certo: só então a linha de adicionar se limpa / a edição fecha.
  aoAdicionar: (form: F) => Promise<boolean>;
  aoSalvar: (linha: T, form: F) => Promise<boolean>;
  aoExcluir: (linha: T) => void;
  podeEditar?: boolean;
  podeAdicionar?: boolean;
  // Mínimo de registros que a tabela pede (ex.: 3 marcos no cronograma): enquanto faltar, aparecem linhas de
  // adicionar até completar o mínimo, já abertas; depois, só uma. Cada linha salva sozinha no "+ adicionar".
  minimoLinhas?: number;
}

const classeCelula = (centralizada?: boolean) => (centralizada ? 'crud-tabela__celula--centralizada' : undefined);

export function TabelaEditavel<T, F>({
  linhas,
  chave,
  colunas,
  formVazio,
  paraForm,
  aoAdicionar,
  aoSalvar,
  aoExcluir,
  podeEditar = true,
  podeAdicionar = podeEditar,
  minimoLinhas = 0,
}: TabelaEditavelProps<T, F>) {
  // Um formulário por linha de adicionar; a linha i que não está no array usa o formVazio.
  const [novos, setNovos] = useState<F[]>([]);
  const quantasNovas = Math.max(1, minimoLinhas - linhas.length);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [edicao, setEdicao] = useState<F>(formVazio);

  const formNovo = (indice: number): F => novos[indice] ?? formVazio;
  const mudarNovo = (indice: number) => (parcial: Partial<F>) =>
    setNovos((atuais) => {
      const proximos = [...atuais];
      for (let i = proximos.length; i < indice; i++) proximos[i] = formVazio;
      proximos[indice] = { ...(atuais[indice] ?? formVazio), ...parcial };
      return proximos;
    });
  const mudarEdicao = (parcial: Partial<F>) => setEdicao((atual) => ({ ...atual, ...parcial }));

  // Deu certo: a linha salva sai do array (vira registro), e as outras continuam com o que já foi digitado.
  const adicionar = async (indice: number) => {
    if (await aoAdicionar(formNovo(indice))) {
      setNovos((atuais) => atuais.filter((_, i) => i !== indice));
    }
  };

  const salvar = async (linha: T) => {
    if (await aoSalvar(linha, edicao)) {
      setIdEditando(null);
    }
  };

  return (
    <>
      <div className="crud-tabela__wrapper">
        <table className={'crud-tabela mb-3' + (colunas.some((coluna) => coluna.principal) ? ' crud-tabela--com-principal' : '')}>
          <thead>
            <tr>
              {colunas.map((coluna) => (
                <th
                  key={coluna.rotulo}
                  className={[classeCelula(coluna.centralizada), coluna.principal && 'crud-tabela__col--principal'].filter(Boolean).join(' ') || undefined}
                >
                  {coluna.rotulo}
                  {coluna.dica && <> <Tooltip texto={coluna.dica} baixo esquerda /></>}
                </th>
              ))}
              {podeEditar && <CabecalhoAcoes />}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => {
              const emEdicao = idEditando === chave(linha);
              return (
                <tr key={chave(linha)}>
                  {colunas.map((coluna) => (
                    <td key={coluna.rotulo} className={classeCelula(coluna.centralizada)}>
                      {emEdicao && coluna.editavel !== false ? coluna.campo(edicao, mudarEdicao) : coluna.exibir(linha)}
                    </td>
                  ))}
                  {podeEditar && (
                    <CelulaAcoesLivre>
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
                            <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => aoExcluir(linha)} />
                          </>
                        )}
                    </CelulaAcoesLivre>
                  )}
                </tr>
              );
            })}
            {podeAdicionar &&
              Array.from({ length: quantasNovas }, (_, indice) => (
                <tr key={`novo-${indice}`}>
                  {colunas.map((coluna) => (
                    <td key={coluna.rotulo}>{coluna.campo(formNovo(indice), mudarNovo(indice))}</td>
                  ))}
                  <CelulaAcoesLivre>
                    <button type="button" className="btn btn-sucesso btn-pequeno whitespace-nowrap" onClick={() => void adicionar(indice)}>
                      + adicionar
                    </button>
                  </CelulaAcoesLivre>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

    </>
  );
}
