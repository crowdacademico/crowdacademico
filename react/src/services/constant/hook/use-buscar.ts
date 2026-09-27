import { useEffect, useState } from 'react';
import type { DependencyList } from 'react';
import { useErroToast } from '../../../components/layout/toast/use-erro-toast';

type ErrosDaTela = Pick<ReturnType<typeof useErroToast>, 'erro' | 'reportarErro' | 'limparErro'>;

interface OpcoesBuscar<T> {
  // "Carregar para editar": roda quando o dado chega, para preencher o formulário da tela (ex.: o texto do termo,
  // os campos da campanha). O dado continua em `dado` também.
  aoChegar?: (dado: T) => void;
  // O useErroToast da própria tela, quando o erro de carregar e o de salvar devem aparecer no mesmo lugar.
  erros?: ErrosDaTela;
}

// Único lugar do "buscar dado quando algo muda": mostra Carregando, guarda o resultado, reporta o erro (texto +
// toast). Usado pela GenericTable (listagem), pelo LogAuditoriaPainel, pelo Dashboard e pelas telas que buscam o
// dado e depois deixam editar (`aoChegar`). `recarregar()` busca de novo com as mesmas dependências.
//
// Resposta atrasada: se `dependencias` mudam de novo antes da busca anterior voltar (trocou de página 2 vezes
// rápido, fechou o modal no meio), a resposta velha é descartada, nunca sobrescreve a nova nem mexe em estado de
// componente já desmontado. Em caso de erro, `dado` continua com o último valor bom.
export function useBuscar<T>(buscar: () => Promise<T>, dependencias: DependencyList, opcoes: OpcoesBuscar<T> = {}) {
  const errosProprios = useErroToast();
  const { erro, reportarErro, limparErro } = opcoes.erros ?? errosProprios;
  const [dado, setDado] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vigente = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    limparErro();
    buscar()
      .then((resultado) => {
        if (!vigente) return;
        setDado(resultado);
        opcoes.aoChegar?.(resultado);
      })
      .catch((erroRequisicao: unknown) => {
        if (vigente) reportarErro(erroRequisicao);
      })
      .finally(() => {
        if (vigente) setCarregando(false);
      });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, versao]);

  const recarregar = () => setVersao((atual) => atual + 1);

  return { dado, carregando, erro, reportarErro, limparErro, recarregar };
}
