import { useState } from 'react';

// Erro por campo, no lugar do botão desabilitado sem explicação (heurísticas de Nielsen 1 e 9: mostrar o estado e
// ajudar a corrigir). O botão fica sempre clicável; `tentarEnviar()` marca a tentativa e diz se pode seguir. Depois da
// primeira tentativa, cada campo mostra o próprio erro (via `erroDe`, que vai na prop `erro` do <Campo>) e o erro some
// sozinho quando a pessoa corrige, porque `validar` roda a cada render. O foco vai para o primeiro campo com erro.
//
// `validar` devolve só os campos com problema: { titulo: 'Informe o título.' }. Campo sem erro fica de fora (ou vazio).
export function useErrosFormulario<Campo extends string>(validar: () => Partial<Record<Campo, string | false>>) {
  const [tentou, setTentou] = useState(false);
  const erros = validar();
  const temErro = Object.values(erros).some(Boolean);

  const erroDe = (campo: Campo): string | undefined => (tentou ? erros[campo] || undefined : undefined);

  const tentarEnviar = (): boolean => {
    setTentou(true);
    if (temErro) {
      // Depois do render que pinta os erros: o primeiro campo marcado dentro do modal aberto (ou da página).
      requestAnimationFrame(() => {
        const dialogos = document.querySelectorAll('[role="dialog"]');
        const escopo = dialogos.length > 0 ? dialogos[dialogos.length - 1] : document;
        escopo.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
    }
    return !temErro;
  };

  return { erroDe, tentarEnviar, temErro, tentou, limpar: () => setTentou(false) };
}
