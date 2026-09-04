const PALETA_AVATAR = [
  'var(--cor-avatar-1)',
  'var(--cor-avatar-2)',
  'var(--cor-avatar-3)',
  'var(--cor-avatar-4)',
  'var(--cor-avatar-5)',
  'var(--cor-avatar-6)',
  'var(--cor-avatar-7)',
];

// Hash simples (soma de código de caractere) - DETERMINÍSTICO de propósito
// (09-08-2026, Bloco B/C): a mesma pessoa cai sempre na mesma cor, em
// qualquer tela/sessão, sem guardar nada no banco. Nada de Math.random().
function corPorNome(nome) {
  let soma = 0;
  for (let i = 0; i < nome.length; i += 1) {
    soma += nome.charCodeAt(i);
  }
  return PALETA_AVATAR[soma % PALETA_AVATAR.length];
}

// Bolinha do cabeçalho - foto quando `usuario.idImagemPerfil`/`foto` vier
// preenchido (upload já existe, `25-arquivo` - é o que `SeletorFotoPerfil`
// usa), inicial do primeiro nome em maiúsculo quando não há foto.
const CLASSE_TAMANHO = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-14 h-14 text-xl',
  // 'xl' (10-08-2026, card de perfil largo do Minha Conta) - grande o
  // bastante pra ser o elemento visual principal de um card lateral, sem
  // exigir upload de foto de verdade pra já parecer "de gente grande"
  // (a inicial colorida já resolve isso, mesma lógica do resto do app).
  xl: 'w-24 h-24 text-4xl',
  // 'xxl' (11-08-2026, faixa de identidade do Minha Conta, estilo perfil
  // acadêmico tipo ORCID/Google Acadêmico) - 112px, o maior da escala,
  // âncora visual de uma faixa larga no topo da página.
  xxl: 'w-28 h-28 text-5xl',
};

// 'quadrado' (10-08-2026, pedido do Lucas: "o quadradinho da imagem",
// card de perfil parecido com portfólio) - rounded-2xl, não rounded-lg
// nem cantos retos: seguem o mesmo raio generoso já usado nos cartões do
// painel (cartao-formulario.jsx usa rounded-3xl), só um degrau abaixo.
// 'circulo' continua sendo o padrão em todo o resto do app (cabeçalho,
// tabelas, dropdown) - não muda nada pra quem já usa o componente.
const CLASSE_FORMA = {
  circulo: 'rounded-full',
  quadrado: 'rounded-2xl',
};

export function AvatarUsuario({ nome, foto, tamanho = 'md', forma = 'circulo' }) {
  const classeTamanho = CLASSE_TAMANHO[tamanho] ?? CLASSE_TAMANHO.md;
  const classeForma = CLASSE_FORMA[forma] ?? CLASSE_FORMA.circulo;
  const nomeSeguro = nome?.trim() || '?';

  if (foto) {
    return (
      <img
        src={foto}
        alt={nomeSeguro}
        className={classeTamanho + ' ' + classeForma + ' object-cover shrink-0'}
      />
    );
  }

  return (
    <div
      className={
        classeTamanho +
        ' ' +
        classeForma +
        ' flex items-center justify-center font-bold text-white shrink-0'
      }
      style={{ backgroundColor: corPorNome(nomeSeguro) }}
      aria-hidden="true"
    >
      {nomeSeguro[0].toUpperCase()}
    </div>
  );
}
