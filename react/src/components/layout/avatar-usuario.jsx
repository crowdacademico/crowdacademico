const PALETA_AVATAR = [
  'var(--cor-avatar-1)',
  'var(--cor-avatar-2)',
  'var(--cor-avatar-3)',
  'var(--cor-avatar-4)',
  'var(--cor-avatar-5)',
  'var(--cor-avatar-6)',
  'var(--cor-avatar-7)',
];

// Hash simples (soma de código de caractere) — DETERMINÍSTICO de propósito
// (09-08-2026, Bloco B/C): a mesma pessoa cai sempre na mesma cor, em
// qualquer tela/sessão, sem guardar nada no banco. Nada de Math.random().
function corPorNome(nome) {
  let soma = 0;
  for (let i = 0; i < nome.length; i += 1) {
    soma += nome.charCodeAt(i);
  }
  return PALETA_AVATAR[soma % PALETA_AVATAR.length];
}

// Bolinha do cabeçalho — foto quando `usuario.idImagemPerfil` existir (o
// upload de arquivo ainda não está implementado, ver PENDENCIAS.md; quando
// existir, é só trocar `foto` por uma URL de verdade aqui, nada mais no
// componente muda), inicial do primeiro nome em maiúsculo enquanto isso.
const CLASSE_TAMANHO = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-14 h-14 text-xl',
};

export function AvatarUsuario({ nome, foto, tamanho = 'md' }) {
  const classeTamanho = CLASSE_TAMANHO[tamanho] ?? CLASSE_TAMANHO.md;
  const nomeSeguro = nome?.trim() || '?';

  if (foto) {
    return (
      <img
        src={foto}
        alt={nomeSeguro}
        className={classeTamanho + ' rounded-full object-cover shrink-0'}
      />
    );
  }

  return (
    <div
      className={
        classeTamanho +
        ' rounded-full flex items-center justify-center font-bold text-white shrink-0'
      }
      style={{ backgroundColor: corPorNome(nomeSeguro) }}
      aria-hidden="true"
    >
      {nomeSeguro[0].toUpperCase()}
    </div>
  );
}
