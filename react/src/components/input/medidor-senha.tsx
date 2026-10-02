// Medidor de força da senha nova: barra + requisitos marcados conforme cumpridos, enquanto a pessoa digita (não uma
// mensagem de erro só depois de enviar). Usado no Cadastro e na troca de senha de Minha Conta.
//
// Os requisitos são só GUIA visual: o piso de verdade continua sendo o backend (@MinLength(8) nos DTOs de cadastro e
// de alteração de usuário). Não faz sentido bloquear o clique por maiúscula, número ou símbolo se o servidor aceitaria
// com menos.
interface RequisitoSenha {
  chave: string;
  rotulo: string;
  testar: (s: string) => boolean;
}

const REQUISITOS_SENHA: RequisitoSenha[] = [
  { chave: 'tamanho', rotulo: 'Pelo menos 8 caracteres', testar: (s) => s.length >= 8 },
  { chave: 'maiuscula', rotulo: 'Uma letra maiúscula', testar: (s) => /[A-Z]/.test(s) },
  { chave: 'numero', rotulo: 'Um número', testar: (s) => /[0-9]/.test(s) },
  {
    chave: 'simbolo',
    rotulo: 'Um símbolo (!@#$...)',
    testar: (s) => /[^A-Za-z0-9]/.test(s),
  },
];

interface MedidorSenhaProps {
  senha: string;
}

export function MedidorSenha({ senha }: MedidorSenhaProps) {
  if (senha.length === 0) {
    return null;
  }
  const requisitosCumpridos = REQUISITOS_SENHA.filter((r) => r.testar(senha)).length;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {REQUISITOS_SENHA.map((r, indice) => (
          <div
            key={r.chave}
            className={'h-1 flex-1 rounded-full ' + (indice < requisitosCumpridos ? 'fundo-marca' : 'fundo-sutil')}
          ></div>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
        {REQUISITOS_SENHA.map((r) => {
          const cumprido = r.testar(senha);
          return (
            <li
              key={r.chave}
              className={'legenda flex items-center gap-1.5 texto-herdado ' + (cumprido ? 'texto-sucesso' : 'texto-fraco')}
            >
              <i className={'fa-solid ' + (cumprido ? 'fa-circle-check' : 'fa-circle') + ' text-[10px]'}></i>
              {r.rotulo}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
