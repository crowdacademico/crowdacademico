import type { ReactNode } from 'react';
import { SENHA_MINIMO_CARACTERES } from '../../services/3-auth/constants/senha.constants';
// Medidor de força da senha nova: barra + requisitos marcados conforme cumpridos, enquanto a pessoa digita (não uma
// mensagem de erro só depois de enviar). Usado no Cadastro e na troca de senha de Minha Conta.
//
// Os requisitos são só GUIA visual: o piso de verdade continua sendo o backend (SENHA_MINIMO_CARACTERES nos DTOs de cadastro e
// de alteração de usuário). Não faz sentido bloquear o clique por maiúscula, número ou símbolo se o servidor aceitaria
// com menos.
interface RequisitoSenha {
  chave: string;
  rotulo: string;
  // O mesmo requisito em poucas palavras, para a linha só (`emLinha`).
  rotuloCurto: string;
  testar: (s: string) => boolean;
}

const REQUISITOS_SENHA: RequisitoSenha[] = [
  {
    chave: 'tamanho',
    rotulo: `Pelo menos ${SENHA_MINIMO_CARACTERES} caracteres`,
    rotuloCurto: `Pelo menos ${SENHA_MINIMO_CARACTERES} caracteres`,
    testar: (s) => s.length >= SENHA_MINIMO_CARACTERES,
  },
  { chave: 'maiuscula', rotulo: 'Uma letra maiúscula', rotuloCurto: 'Letra maiúscula', testar: (s) => /[A-Z]/.test(s) },
  { chave: 'numero', rotulo: 'Um número', rotuloCurto: 'Número', testar: (s) => /[0-9]/.test(s) },
  {
    chave: 'simbolo',
    rotulo: 'Um símbolo (!@#$...)',
    rotuloCurto: 'Símbolo (!@#$...)',
    testar: (s) => /[^A-Za-z0-9]/.test(s),
  },
];

interface MedidorSenhaProps {
  senha: string;
  // Os requisitos numa linha só, alinhados à direita (terminam embaixo do botão ao lado da caixa), quebrando só se não
  // couber (onde há largura, como o Alterar Usuário). Sem isto, em
  // duas colunas (Cadastro, Minha Conta e Redefinir senha, que são estreitos).
  emLinha?: boolean;
  // Com a senha vazia, ocupa o lugar invisível em vez de sumir: o que vem embaixo não é empurrado quando a pessoa
  // começa a digitar (o Alterar Usuário).
  reservarEspaco?: boolean;
  // Em linha: a barra e a lista viram filhas diretas da grade de quem usa (`display: contents`), cada uma com a classe
  // pedida (a barra embaixo da caixa, a lista na linha toda). `aoLadoDaBarra`: o que fica à direita da barra, na
  // mesma linha (uma cópia invisível do botão ao lado da caixa, para a barra terminar onde a caixa termina).
  classeBarra?: string;
  classeLista?: string;
  aoLadoDaBarra?: ReactNode;
}

export function MedidorSenha({
  senha,
  emLinha = false,
  reservarEspaco = false,
  classeBarra = '',
  classeLista = '',
  aoLadoDaBarra,
}: MedidorSenhaProps) {
  const vazia = senha.length === 0;
  if (vazia && !reservarEspaco) {
    return null;
  }
  const requisitosCumpridos = REQUISITOS_SENHA.filter((r) => r.testar(senha)).length;
  return (
    // Em linha, sem margem nem caixa própria (`contents`): quem usa põe a barra e a lista na grade dele.
    <div className={(emLinha ? 'contents' : 'mt-2 space-y-1.5') + (vazia ? ' invisible' : '')} aria-hidden={vazia || undefined}>
      <div className={'flex gap-2 ' + classeBarra}>
        <div className="flex gap-1 flex-1 min-w-0">
          {REQUISITOS_SENHA.map((r, indice) => (
            <div
              key={r.chave}
              className={'h-1 flex-1 rounded-full ' + (indice < requisitosCumpridos ? 'fundo-marca' : 'fundo-sutil')}
            ></div>
          ))}
        </div>
        {/* Só a LARGURA do que vem ao lado (h-0): sem isso, a cópia invisível de um botão dava à linha da barra a altura do
            botão, e abria um vão enorme antes da lista. */}
        {aoLadoDaBarra && <div className="h-0 overflow-hidden shrink-0">{aoLadoDaBarra}</div>}
      </div>
      <ul className={(emLinha ? 'flex flex-wrap justify-end gap-x-3 gap-y-1 ' : 'grid grid-cols-2 gap-x-2 gap-y-1 ') + classeLista}>
        {REQUISITOS_SENHA.map((r) => {
          const cumprido = r.testar(senha);
          return (
            <li
              key={r.chave}
              className={'legenda flex items-center gap-1.5 texto-herdado ' + (cumprido ? 'texto-sucesso' : 'texto-fraco')}
            >
              <i className={'fa-solid ' + (cumprido ? 'fa-circle-check' : 'fa-circle') + ' icone-pequeno'} aria-hidden="true"></i>
              {emLinha ? r.rotuloCurto : r.rotulo}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
