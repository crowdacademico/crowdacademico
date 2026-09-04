import { useState } from 'react';
import { useToast } from './use-toast';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

// Junta num lugar só o par que se repetia em toda tela - setErro(traduzirErro(erro))
// pro texto vermelho que já existia + mostrar(..., 'erro') pro toast (pedido do
// Lucas, 07-08-2026: "se vc conseguir fazer sem hardcoded, seria incrível"). Troca
// um catch de 2 linhas por 1 chamada (reportarErro(erroRequisicao)) - qualquer tela
// nova que adote isto ganha o toast de graça, sem precisar lembrar da 2ª linha.
export function useErroToast() {
  const [erro, setErro] = useState('');
  const { mostrar } = useToast();

  const reportarErro = (erroRequisicao) => {
    const mensagem = traduzirErro(erroRequisicao);
    setErro(mensagem);
    mostrar(mensagem, undefined, 'erro');
    return mensagem;
  };

  const limparErro = () => setErro('');

  return { erro, reportarErro, limparErro, setErro };
}
