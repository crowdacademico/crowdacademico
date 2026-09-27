import { useState } from 'react';
import { useToast } from './use-toast';
import { ErroHttp } from '../../../services/constant/api/http.util';
import { traduzirErro } from '../../../services/constant/api/traduzir-erro.util';

// Junta num lugar só o par que se repetia em toda tela: setErro(traduzirErro(erro)) para o texto vermelho que
// já existia + mostrar(..., 'erro') para o toast. Troca um catch de 2 linhas por 1 chamada
// (reportarErro(erroRequisicao)): qualquer tela nova que adote isto ganha o toast de graça, sem precisar
// lembrar da 2ª linha.
//
// Erro por campo: quando o backend manda `campos` (validação do DTO, duplicidade), eles ficam em `errosCampo`
// (a primeira mensagem de cada campo) para o componente `Campo` mostrar embaixo do campo certo. Nesse caso o
// texto vermelho do topo fica vazio (o erro já aparece no campo) e o toast continua avisando. `limparErroCampo`
// apaga o erro de um campo quando a pessoa volta a digitar nele.
export function useErroToast() {
  const [erro, setErro] = useState('');
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const { mostrar } = useToast();

  const reportarErro = (erroRequisicao: unknown): string => {
    const mensagem = traduzirErro(erroRequisicao);
    const campos = erroRequisicao instanceof ErroHttp ? erroRequisicao.campos : undefined;
    const porCampo = Object.fromEntries(
      Object.entries(campos ?? {}).flatMap(([campo, mensagens]) => (mensagens[0] ? [[campo, mensagens[0]]] : [])),
    );
    setErrosCampo(porCampo);
    setErro(Object.keys(porCampo).length > 0 ? '' : mensagem);
    mostrar(mensagem, undefined, 'erro');
    return mensagem;
  };

  const limparErro = () => {
    setErro('');
    setErrosCampo({});
  };

  const limparErroCampo = (campo: string) => {
    setErrosCampo((atuais) => {
      if (!(campo in atuais)) {
        return atuais;
      }
      const restantes = { ...atuais };
      delete restantes[campo];
      return restantes;
    });
  };

  return { erro, reportarErro, limparErro, setErro, errosCampo, limparErroCampo };
}
