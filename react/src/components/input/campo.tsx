import { useId } from 'react';
import type { ReactNode } from 'react';

// Bloco de formulário que se repetia em toda tela: rótulo + campo + (mensagem de erro OU dica) + borda vermelha
// + aria-invalid/aria-describedby ligando o campo à mensagem. O erro pode ser local (ex.: código com minúscula)
// ou do servidor (`errosCampo` de useErroToast: validação do DTO, nome duplicado); o erro, quando existe, toma
// o lugar da dica.
//
// O campo em si vem pela função `children`, para servir a input, select e textarea sem uma prop para cada
// atributo: `atributos` vai espalhado no elemento (id + aria), `classeErro` entra no className.
export interface CampoRenderizado {
  atributos: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string };
  classeErro: string;
}

interface CampoProps {
  rotulo: ReactNode;
  dica?: ReactNode;
  // Texto, ou conteúdo com link (ex.: "Já existe conta com este e-mail. Entrar"). Vazio/false/null = sem erro.
  erro?: ReactNode;
  className?: string;
  children: (campo: CampoRenderizado) => ReactNode;
}

export function Campo({ rotulo, dica, erro, className, children }: CampoProps) {
  const id = useId();
  const idMensagem = useId();
  const temErro = Boolean(erro);
  const temMensagem = temErro || Boolean(dica);

  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo-campo">
        {rotulo}
      </label>
      {children({
        atributos: {
          id,
          'aria-invalid': temErro,
          ...(temMensagem ? { 'aria-describedby': idMensagem } : {}),
        },
        classeErro: temErro ? ' borda-erro' : '',
      })}
      {temErro ? (
        <p id={idMensagem} className="text-xs texto-erro font-semibold mt-1">
          {erro}
        </p>
      ) : (
        dica && (
          <p id={idMensagem} className="text-xs texto-fraco mt-1">
            {dica}
          </p>
        )
      )}
    </div>
  );
}
