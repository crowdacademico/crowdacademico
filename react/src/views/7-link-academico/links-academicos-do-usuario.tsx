import { useState } from 'react';
import { BotaoMostrarEsconder } from '../../components/crud/botao-mostrar-esconder';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { TabelaLinksAcademicos } from '../../components/crud/tabelas/1-tabela-links-academicos';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { useAvisoScore } from '../../services/6-perfil-pesquisador/hook/use-aviso-score';
import { linkAcademicoApi } from '../../services/7-link-academico/api/link-academico.api';
import { EXEMPLO_LINK_POR_TIPO } from '../../services/7-link-academico/constants/exemplos-link.constants';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';
import type { LinkAcademicoRequestCreate, LinkAcademicoResponse } from '../../services/7-link-academico/type/link-academico.type';

interface LinksAcademicosDoUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  // Nome no aviso da pontuação ("Usuário #12 Ana: score total +8 pontos").
  nomeUsuario?: string;
  // Nota nova depois de adicionar ou retirar link, para quem mostra a nota na mesma tela (Alterar Usuário).
  aoMudarScore?: (scoreTotal: number) => void;
  // A própria conta grava pelo POST de quem está logado; a de outra pessoa, pelo "criar para outro" (admin).
  contaPropria?: boolean;
  // Enquanto o perfil de pesquisador não existe, só pesquisador tem link: a tabela aparece vazia, sem edição, com
  // este aviso no lugar.
  bloqueadoAte?: string;
}

// Links acadêmicos de um pesquisador (Alterar Usuário e o upgrade de perfil). Cada ação grava na hora; o erro vai no
// aviso flutuante (a tabela não tem texto de erro próprio).
export function LinksAcademicosDoUsuario({
  auth,
  idUsuario,
  nomeUsuario,
  aoMudarScore,
  contaPropria = false,
  bloqueadoAte,
}: LinksAcademicosDoUsuarioProps) {
  const limiteLinks = useConfiguracoes().obterNumero('limite_links_academicos_perfil', 5);
  // Só os tipos que podem ir no perfil do pesquisador.
  const { dado: tiposLink } = useBuscar(() => tipoLinkApi.listar(auth.authFetch, { escopo: 'perfil' }), []);

  if (bloqueadoAte) {
    return (
      <div className="space-y-3">
        <h3 className="titulo-bloco titulo-bloco--linha">Links acadêmicos (0 de {limiteLinks})</h3>
        <CaixaAviso titulo={bloqueadoAte} />
        <TabelaLinksAcademicos links={[]} tiposLink={tiposLink ?? []} />
      </div>
    );
  }
  return (
    <LinksEditaveis
      auth={auth}
      idUsuario={idUsuario}
      nomeUsuario={nomeUsuario}
      aoMudarScore={aoMudarScore}
      contaPropria={contaPropria}
      limiteLinks={limiteLinks}
      tiposLink={tiposLink ?? []}
    />
  );
}

interface LinksEditaveisProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  nomeUsuario?: string;
  aoMudarScore?: (scoreTotal: number) => void;
  contaPropria: boolean;
  limiteLinks: number;
  tiposLink: TipoLinkResponse[];
}

function LinksEditaveis({ auth, idUsuario, nomeUsuario, aoMudarScore, contaPropria, limiteLinks, tiposLink }: LinksEditaveisProps) {
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const { dado, recarregar } = useBuscar(() => linkAcademicoApi.listarDoUsuario(auth.authFetch, idUsuario), [idUsuario]);
  const links = dado ?? [];
  const [verExemplos, setVerExemplos] = useState(false);

  const { lerScore, avisarScore } = useAvisoScore(auth.authFetch, idUsuario, nomeUsuario);

  // Chamadas da tabela (components/crud/tabelas/1-tabela-links-academicos.tsx): devolvem true quando deu certo.
  // `comScore`: adicionar e retirar link mudam a pontuação, e um segundo aviso diz quanto (mesmo +0, quando o
  // link não conta de novo, como um segundo link do mesmo grupo).
  const executar = async (acao: () => Promise<unknown>, mensagem: string, comScore = false): Promise<boolean> => {
    try {
      const antes = comScore ? await lerScore() : null;
      await acao();
      recarregar();
      mostrar(mensagem);
      const depois = antes === null ? null : await lerScore();
      avisarScore(antes, depois);
      if (depois !== null) aoMudarScore?.(depois);
      return true;
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      return false;
    }
  };

  const adicionarLink = (dados: LinkAcademicoRequestCreate) =>
    executar(
      () =>
        contaPropria
          ? linkAcademicoApi.criar(auth.authFetch, dados)
          : linkAcademicoApi.criarParaOutro(auth.authFetch, idUsuario, dados),
      'Link acadêmico adicionado com sucesso.',
      true,
    );

  const removerLink = (link: LinkAcademicoResponse) =>
    executar(() => linkAcademicoApi.remover(auth.authFetch, link.idLinkAcademico), 'Link acadêmico excluído com sucesso.', true);

  // O tipo não muda depois de criado: o PATCH leva url e rótulo (rótulo apagado vai como null; a ordem fica).
  const salvarLink = (link: LinkAcademicoResponse, { url, rotulo }: LinkAcademicoRequestCreate) =>
    executar(
      () => linkAcademicoApi.alterar(auth.authFetch, link.idLinkAcademico, { url, rotulo: rotulo ? rotulo : null }),
      'Link acadêmico alterado com sucesso.',
    );

  return (
    <div>
      <h3 className="titulo-bloco titulo-bloco--linha">
        Links acadêmicos ({links.length} de {limiteLinks})
      </h3>
      <TabelaLinksAcademicos
        links={links}
        tiposLink={tiposLink}
        edicao={{
          podeAdicionar: links.length < limiteLinks,
          aoAdicionar: adicionarLink,
          aoSalvar: salvarLink,
          aoExcluir: (link) => void removerLink(link),
        }}
      />
      <BotaoMostrarEsconder aberto={verExemplos} aoAlternar={() => setVerExemplos((v) => !v)} rotulo="exemplos de link" className="mt-3" />
      {verExemplos && (
        <ul className="legenda mt-2 space-y-1">
          {tiposLink.map(
            (tipo) =>
              EXEMPLO_LINK_POR_TIPO[tipo.codigo] && (
                <li key={tipo.codigo} className="select-all">
                  {EXEMPLO_LINK_POR_TIPO[tipo.codigo]}
                </li>
              ),
          )}
        </ul>
      )}
    </div>
  );
}
