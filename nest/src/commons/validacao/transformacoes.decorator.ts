import { Transform } from 'class-transformer';

// Transformações de entrada usadas pelos DTOs. Rodam ANTES do class-validator (precisa de `transform: true` no
// ValidationPipe global, ligado em main.ts), então a validação já enxerga o valor limpo.

// Query string sempre chega como string: `@Type(() => Boolean)` sozinho converteria "false" (string não-vazia)
// em `true`. Aqui só "true"/"false" viram booleano; qualquer outro valor passa intacto e o @IsBoolean recusa.
export function BooleanoDaQuery(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });
}

// E-mail sem espaço nas pontas e em minúsculas: "Ana@USP.br" e "ana@usp.br" são a mesma conta, no cadastro e no
// login. O banco normaliza de novo (trg_usuario_normaliza_email, 05), para nenhum caminho gravar diferente.
export function EmailNormalizado(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}

// Nome/descrição de catálogo: tira espaço das pontas e junta espaços repetidos no meio ("  Site   Pessoal " ->
// "Site Pessoal"). Não mexe em maiúscula/minúscula de propósito: ORCID, GitHub, LinkedIn e frases de motivo têm
// grafia própria. Só-espaço vira "" e cai no @IsNotEmpty. Valor que não é texto passa intacto para o @IsString
// recusar.
export function TextoLimpo(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  );
}
