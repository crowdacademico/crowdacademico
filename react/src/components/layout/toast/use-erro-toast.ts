import { useState } from 'react';
import { useToast } from './use-toast';
import { ErroHttp } from '../../../services/constant/api/http.util';
import { traduzirErro } from '../../../services/constant/api/traduzir-erro.util';

interface OpcoesErroToast {
  // A tela mostra o próprio erro (texto vermelho com MensagemErro, ou embaixo do campo): o aviso flutuante não
  // aparece, para a mesma frase não sair duas vezes. Em vez dele, a tela rola até o erro (e põe o cursor no campo,
  // quando o erro é de um campo). Sem nada visível para mostrar, cai no aviso flutuante: o erro nunca fica escondido.
  mostraTexto?: boolean;
}

// Junta num lugar só o que se repetia em toda tela: setErro(traduzirErro(erro)) para o texto vermelho + o aviso
// flutuante. Troca um catch de 2 linhas por 1 chamada (reportarErro(erroRequisicao)).
//
// Onde o erro aparece (padrão do Stripe e do GitHub): tela com formulário mostra o erro ao lado de onde se corrige
// (`mostraTexto`); ação fora de formulário (excluir numa lista, encerrar uma sessão) usa o aviso flutuante.
//
// Erro por campo: quando o backend manda `campos` (validação do DTO, duplicidade), eles ficam em `errosCampo`
// (a primeira mensagem de cada campo) para o componente `Campo` mostrar embaixo do campo certo. Nesse caso o
// texto vermelho do topo fica vazio (o erro já aparece no campo). `limparErroCampo` apaga o erro de um campo
// quando a pessoa volta a digitar nele.
export function useErroToast({ mostraTexto = false }: OpcoesErroToast = {}) {
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
    if (mostraTexto) {
      levarAoErro(() => mostrar(mensagem, undefined, 'erro'));
    } else {
      mostrar(mensagem, undefined, 'erro');
    }
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

// Depois do render que desenha o erro: o primeiro campo marcado (ou o texto vermelho) dentro do modal aberto, ou da
// página. Numa janela longa, o erro podia estar fora da vista; o aviso flutuante garantia que ele aparecia, e agora
// é a rolagem que garante.
function levarAoErro(semNadaVisivel: () => void) {
  requestAnimationFrame(() => {
    const dialogos = document.querySelectorAll('[role="dialog"]');
    const escopo = dialogos.length > 0 ? dialogos[dialogos.length - 1] : document;
    const campo = escopo.querySelector<HTMLElement>('[aria-invalid="true"]');
    const alvo = campo ?? escopo.querySelector<HTMLElement>('[data-mensagem-erro]');
    if (!alvo) {
      semNadaVisivel();
      return;
    }
    alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
    campo?.focus({ preventScroll: true });
  });
}
