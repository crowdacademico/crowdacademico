import { useId } from 'react';
import type { ReactNode } from 'react';
import { MarcaObrigatorio } from './marca-obrigatorio';

// Bloco de formulário que se repetia em toda tela: rótulo + campo + (mensagem de erro OU dica) + borda vermelha
// + aria-invalid/aria-describedby ligando o campo à mensagem. O erro pode ser local (ex.: código com minúscula)
// ou do servidor (`errosCampo` de useErroToast: validação do DTO, nome duplicado); o erro, quando existe, toma
// o lugar da dica.
//
// O campo em si vem pela função `children`, para servir a input, select e textarea sem uma prop para cada
// atributo: `atributos` vai espalhado no elemento (id + aria), `classeErro` entra no className.
export interface CampoRenderizado {
  atributos: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; 'aria-required'?: true };
  classeErro: string;
}

interface CampoProps {
  rotulo: ReactNode;
  dica?: ReactNode;
  // Texto, ou conteúdo com link (ex.: "Já existe conta com este e-mail. Entrar"). Vazio/false/null = sem erro.
  erro?: ReactNode;
  className?: string;
  // Campo obrigatório num formulário que também tem campos opcionais: o "*" depois do rótulo (escondido do leitor de
  // tela, que ouve "obrigatório" pelo aria-required do campo). Sem legenda "* indica campo obrigatório" (16-11-2026, Lucas).
  // Formulário em que TUDO é obrigatório (login, trocar senha) não marca: o asterisco em todos só polui (16-11-2026).
  obrigatorio?: boolean;
  children: (campo: CampoRenderizado) => ReactNode;
}

export function Campo({ rotulo, dica, erro, className, obrigatorio = false, children }: CampoProps) {
  const id = useId();
  const idMensagem = useId();
  const temErro = Boolean(erro);
  const temMensagem = temErro || Boolean(dica);

  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo-campo">
        {rotulo}
        {obrigatorio && <MarcaObrigatorio />}
      </label>
      {children({
        atributos: {
          id,
          'aria-invalid': temErro,
          ...(temMensagem ? { 'aria-describedby': idMensagem } : {}),
          ...(obrigatorio ? { 'aria-required': true as const } : {}),
        },
        classeErro: temErro ? ' borda-erro' : '',
      })}
      {temErro ? (
        <p id={idMensagem} className="legenda enfase erro-campo">
          {erro}
        </p>
      ) : (
        dica && (
          <p id={idMensagem} className="legenda texto-fraco mt-1">
            {dica}
          </p>
        )
      )}
    </div>
  );
}
