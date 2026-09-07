import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { configuracaoApi } from '../api/configuracao.api';
import { ConfiguracoesContext } from './configuracoes-context';
import type { ValorConfiguracao } from './configuracoes-context';
import type { ConfiguracaoResponse } from '../type/configuracao.type';

// Converte o `valor` (sempre string ou null na coluna) pro tipo real,
// usando o `tipo` que a própria linha declara (mesmo domínio de
// TIPOS_CONFIGURACAO do lado do Nest, db.types.ts - aqui só o parse, sem
// decisão de negócio nenhuma).
function converterValor(linha: ConfiguracaoResponse): ValorConfiguracao | null {
  if (linha.valor === null) {
    return null;
  }
  switch (linha.tipo) {
    case 'decimal':
      return Number(linha.valor);
    case 'inteiro':
      return parseInt(linha.valor, 10);
    case 'booleano':
      return linha.valor === 'true';
    default:
      return linha.valor;
  }
}

interface ConfiguracoesProviderProps {
  children: ReactNode;
}

// Carrega 1x (na montagem) TODAS as configurações globais públicas - hoje
// isso é o GET /configuracoes inteiro, que a RLS já restringe a
// `id_usuario IS NULL` pra quem não está logado (ver comentário em
// configuracao.api.ts). Existe pra qualquer tela (admin ou pública, futura)
// conseguir ler `taxa_plataforma_padrao`, `valor_minimo_contribuicao` etc.
// direto do banco via `obterConfiguracao(...)`, em vez de escrever esses
// valores de negócio direto no HTML/JSX (achado de uma IA, 02-08-2026,
// olhando o Projeto de Interface de referência).
export function ConfiguracoesProvider({ children }: ConfiguracoesProviderProps) {
  const [valores, setValores] = useState<Record<string, ValorConfiguracao | null>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  useEffect(() => {
    configuracaoApi
      .buscarPublicas()
      .then((linhas) => {
        const mapa: Record<string, ValorConfiguracao | null> = {};
        for (const linha of linhas) {
          if (linha.ativo) {
            mapa[linha.chave] = converterValor(linha);
          }
        }
        setValores(mapa);
      })
      .catch((erroRequisicao) => setErro(erroRequisicao))
      .finally(() => setCarregando(false));
  }, []);

  // valorPadrao é obrigatório aqui de propósito: enquanto `carregando` (ou
  // se a chave não existir/estiver inativa), a tela precisa de algo pra
  // mostrar sem cair de volta pra um número escrito à mão em cada
  // componente - o padrão fica declarado UMA vez, no lugar que chama.
  const obterConfiguracao = useMemo(
    () =>
      (chave: string, valorPadrao: ValorConfiguracao): ValorConfiguracao | null =>
        chave in valores ? valores[chave] : valorPadrao,
    [valores],
  );

  return (
    <ConfiguracoesContext.Provider
      value={{ carregando, erro, obterConfiguracao }}
    >
      {children}
    </ConfiguracoesContext.Provider>
  );
}
