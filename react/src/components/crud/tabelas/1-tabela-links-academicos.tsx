import { TabelaEditavel } from './tabela-editavel';
import { TextoResumido } from '../texto-resumido';
import type { ColunaEditavel } from './tabela-editavel';
import type { TipoLinkResponse } from '../../../services/9-tipo-link/type/tipo-link.type';
import type {
  LinkAcademicoRequestCreate,
  LinkAcademicoResponse,
} from '../../../services/7-link-academico/type/link-academico.type';

// Links acadêmicos de um pesquisador (Lattes, ORCID...), com edição na linha. Usada no modal de Alterar Usuário
// (LinksAcademicosDoUsuario, em views/1-usuario/modal-alterar-usuario.tsx), que busca e salva.

interface FormLink {
  idTipoLink: string;
  url: string;
  rotulo: string;
}

const FORM_VAZIO: FormLink = { idTipoLink: '', url: '', rotulo: '' };

// Textos de exemplo dos campos: cada caixa tem o tamanho do próprio texto, não os 20 caracteres padrão do navegador,
// que seguravam a coluna larga (o cabeçalho já diz "Rótulo", então o exemplo só diz que é opcional).
const EXEMPLO_URL = 'URL';
const EXEMPLO_ROTULO = 'Opcional';

function paraDados(form: FormLink): LinkAcademicoRequestCreate {
  return { idTipoLink: Number(form.idTipoLink), url: form.url, ...(form.rotulo ? { rotulo: form.rotulo } : {}) };
}

interface TabelaLinksAcademicosProps {
  links: LinkAcademicoResponse[];
  tiposLink: TipoLinkResponse[];
  // Sem `edicao`, a tabela só mostra (Consultar Usuário).
  edicao?: {
    // Falso quando o pesquisador já atingiu o limite de links (configuracoes.limite_links_academicos_perfil).
    podeAdicionar: boolean;
    aoAdicionar: (dados: LinkAcademicoRequestCreate) => Promise<boolean>;
    aoSalvar: (link: LinkAcademicoResponse, dados: LinkAcademicoRequestCreate) => Promise<boolean>;
    aoExcluir: (link: LinkAcademicoResponse) => void;
  };
}

const NAO_EDITA = () => Promise.resolve(false);

export function TabelaLinksAcademicos({ links, tiposLink, edicao }: TabelaLinksAcademicosProps) {
  const nomeTipo = (idTipoLink: number) => tiposLink.find((tipo) => tipo.idTipolink === idTipoLink)?.nome;

  const colunas: ColunaEditavel<LinkAcademicoResponse, FormLink>[] = [
    {
      rotulo: 'Tipo',
      centralizada: true,
      editavel: false,
      exibir: (link) => nomeTipo(link.idTipoLink) ?? link.idTipoLink,
      campo: (form, mudar) => (
        <select aria-label="Tipo do link" value={form.idTipoLink} onChange={(evento) => mudar({ idTipoLink: evento.target.value })} className="input-padrao">
          <option value="">Tipo...</option>
          {tiposLink.map((tipo) => (
            <option key={tipo.idTipolink} value={tipo.idTipolink}>
              {tipo.nome}
            </option>
          ))}
        </select>
      ),
    },
    {
      rotulo: 'URL',
      principal: true,
      // URL longa: uma linha só, com "ler tudo" (o mesmo das outras tabelas); quebra em qualquer ponto ao abrir.
      exibir: (link) => <TextoResumido texto={link.url} semEspaco />,
      campo: (form, mudar) => (
        <input type="text" aria-label="URL do link" placeholder={EXEMPLO_URL} size={EXEMPLO_URL.length} value={form.url} onChange={(evento) => mudar({ url: evento.target.value })} className="input-padrao" />
      ),
    },
    {
      rotulo: 'Rótulo',
      centralizada: true,
      exibir: (link) => <TextoResumido texto={link.rotulo} />,
      campo: (form, mudar) => (
        <input
          type="text"
          aria-label="Rótulo do link (opcional)"
          placeholder={EXEMPLO_ROTULO}
          size={EXEMPLO_ROTULO.length}
          value={form.rotulo}
          onChange={(evento) => mudar({ rotulo: evento.target.value })}
          className="input-padrao"
        />
      ),
    },
  ];

  return (
    <TabelaEditavel
      linhas={links}
      chave={(link) => link.idLinkAcademico}
      colunas={colunas}
      formVazio={FORM_VAZIO}
      paraForm={(link) => ({ idTipoLink: String(link.idTipoLink), url: link.url, rotulo: link.rotulo ?? '' })}
      podeEditar={Boolean(edicao)}
      podeAdicionar={edicao?.podeAdicionar ?? false}
      aoAdicionar={(form) => (edicao && form.idTipoLink && form.url ? edicao.aoAdicionar(paraDados(form)) : NAO_EDITA())}
      aoSalvar={(link, form) =>
        edicao && form.url ? edicao.aoSalvar(link, paraDados({ ...form, idTipoLink: String(link.idTipoLink) })) : NAO_EDITA()
      }
      aoExcluir={(link) => edicao?.aoExcluir(link)}
    />
  );
}
