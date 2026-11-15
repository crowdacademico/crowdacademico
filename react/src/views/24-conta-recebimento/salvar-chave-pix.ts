import type { TipoToast } from '../../components/layout/toast/toast-context';
import { contaRecebimentoApi } from '../../services/24-conta-recebimento/api/conta-recebimento.api';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';
import type { TipoChavePix } from '../../services/constant/type/enums-do-banco.gerado';

type Mostrar = (titulo: string, descricao?: string, tipo?: TipoToast) => void;

// Salva a chave Pix informada no Cadastro ou no "Quero ser pesquisador", logo depois de o perfil de pesquisador ser criado
// (a chave precisa do CPF do perfil para conferir a titularidade). Chave vazia: não faz nada. Se falhar, o perfil já
// existe: avisa e aponta Minha Conta > Financeiro, sem desfazer nada nem prender a pessoa no cadastro.
export async function salvarChavePixDoNovoPesquisador(
  authFetch: AuthFetch,
  tipoChave: TipoChavePix,
  chave: string,
  mostrar: Mostrar,
): Promise<void> {
  if (!chave.trim()) return;
  try {
    const salva = await contaRecebimentoApi.cadastrar(authFetch, tipoChave, chave.trim());
    if (salva?.titularidadeVerificada) {
      mostrar('Chave Pix salva.', 'Titularidade confirmada: os repasses das suas campanhas vão para ela.', 'sucesso');
    } else {
      mostrar(
        'Chave Pix salva, mas a titularidade não foi confirmada.',
        'O repasse só sai para uma chave no seu CPF. Troque em Minha Conta > Financeiro.',
        'aviso',
      );
    }
  } catch (erro) {
    mostrar('A chave Pix não foi salva.', `${traduzirErro(erro)} Cadastre em Minha Conta > Financeiro.`, 'aviso');
  }
}
