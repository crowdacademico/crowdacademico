import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { TabelaLinksAcademicos } from '../../components/crud/tabelas/1-tabela-links-academicos';
import { linkAcademicoApi } from '../../services/7-link-academico/api/link-academico.api';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { LinkAcademicoRequestCreate, LinkAcademicoResponse } from '../../services/7-link-academico/type/link-academico.type';

interface PainelLinksAcademicosProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
}

// Links acadêmicos de outro pesquisador (Alterar Usuário, aba Pesquisador). Cada ação grava na hora; o erro vai no
// aviso flutuante (a tabela não tem texto de erro próprio).
export function PainelLinksAcademicos({ auth, idUsuario }: PainelLinksAcademicosProps) {
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const { obterConfiguracao } = useConfiguracoes();
  const valorLimiteLinks = obterConfiguracao('limite_links_academicos_perfil', 5);
  const limiteLinks = typeof valorLimiteLinks === 'number' ? valorLimiteLinks : 5;
  const { dado, recarregar } = useBuscar(() => linkAcademicoApi.listarDoUsuario(auth.authFetch, idUsuario), [idUsuario]);
  const links = dado ?? [];
  // Só os tipos que podem ir no perfil do pesquisador.
  const { dado: tiposLink } = useBuscar(() => tipoLinkApi.listar(auth.authFetch, { escopo: 'perfil' }), []);

  // Chamadas da tabela (components/crud/tabelas/1-tabela-links-academicos.tsx): devolvem true quando deu certo.
  const executar = async (acao: () => Promise<unknown>, mensagem: string): Promise<boolean> => {
    try {
      await acao();
      recarregar();
      mostrar(mensagem);
      return true;
    } catch (erro) {
      reportarErro(erro);
      return false;
    }
  };

  const adicionarLink = (dados: LinkAcademicoRequestCreate) =>
    executar(() => linkAcademicoApi.criarParaOutro(auth.authFetch, idUsuario, dados), 'Link acadêmico adicionado com sucesso.');

  const removerLink = (link: LinkAcademicoResponse) =>
    executar(() => linkAcademicoApi.remover(auth.authFetch, link.idLinkAcademico), 'Link acadêmico excluído com sucesso.');

  // O tipo não muda depois de criado: o PATCH leva url e rótulo (rótulo apagado vai como null; a ordem fica).
  const salvarLink = (link: LinkAcademicoResponse, { url, rotulo }: LinkAcademicoRequestCreate) =>
    executar(
      () => linkAcademicoApi.alterar(auth.authFetch, link.idLinkAcademico, { url, rotulo: rotulo ? rotulo : null }),
      'Link acadêmico alterado com sucesso.',
    );

  return (
    <>
      <h3 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">
        Links acadêmicos ({links.length} de {limiteLinks})
      </h3>
      <TabelaLinksAcademicos
        links={links}
        tiposLink={tiposLink ?? []}
        podeAdicionar={links.length < limiteLinks}
        aoAdicionar={adicionarLink}
        aoSalvar={salvarLink}
        aoExcluir={(link) => void removerLink(link)}
      />
    </>
  );
}
