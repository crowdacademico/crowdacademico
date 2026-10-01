import { TabelaEditavel } from './tabela-editavel';
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

// URL longa é cortada na linha (a coluna é estreita); a completa aparece em Consultar.
const TAMANHO_MAXIMO_URL_NA_LINHA = 40;

function truncarUrl(url: string): string {
  return url.length > TAMANHO_MAXIMO_URL_NA_LINHA ? `${url.slice(0, TAMANHO_MAXIMO_URL_NA_LINHA)} ...` : url;
}

function paraDados(form: FormLink): LinkAcademicoRequestCreate {
  return { idTipoLink: Number(form.idTipoLink), url: form.url, ...(form.rotulo ? { rotulo: form.rotulo } : {}) };
}

interface TabelaLinksAcademicosProps {
  links: LinkAcademicoResponse[];
  tiposLink: TipoLinkResponse[];
  // Falso quando o pesquisador já atingiu o limite de links (configuracoes.limite_links_academicos_perfil).
  podeAdicionar: boolean;
  aoAdicionar: (dados: LinkAcademicoRequestCreate) => Promise<boolean>;
  aoSalvar: (link: LinkAcademicoResponse, dados: LinkAcademicoRequestCreate) => Promise<boolean>;
  aoExcluir: (link: LinkAcademicoResponse) => void;
}

export function TabelaLinksAcademicos({ links, tiposLink, podeAdicionar, aoAdicionar, aoSalvar, aoExcluir }: TabelaLinksAcademicosProps) {
  const nomeTipo = (idTipoLink: number) => tiposLink.find((tipo) => tipo.idTipolink === idTipoLink)?.nome;

  const colunas: ColunaEditavel<LinkAcademicoResponse, FormLink>[] = [
    {
      rotulo: 'Tipo',
      centralizada: true,
      editavel: false,
      exibir: (link) => nomeTipo(link.idTipoLink) ?? link.idTipoLink,
      campo: (form, mudar) => (
        <select value={form.idTipoLink} onChange={(evento) => mudar({ idTipoLink: evento.target.value })} className="input-padrao">
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
      exibir: (link) => <span className="whitespace-nowrap">{truncarUrl(link.url)}</span>,
      campo: (form, mudar) => (
        <input type="text" placeholder="URL" value={form.url} onChange={(evento) => mudar({ url: evento.target.value })} className="input-padrao" />
      ),
    },
    {
      rotulo: 'Rótulo',
      centralizada: true,
      exibir: (link) => link.rotulo ?? '-',
      campo: (form, mudar) => (
        <input
          type="text"
          placeholder="Rótulo (opcional)"
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
      podeAdicionar={podeAdicionar}
      classeWrapper="links-academicos-wrapper"
      aoAdicionar={(form) => (form.idTipoLink && form.url ? aoAdicionar(paraDados(form)) : Promise.resolve(false))}
      aoSalvar={(link, form) => (form.url ? aoSalvar(link, paraDados({ ...form, idTipoLink: String(link.idTipoLink) })) : Promise.resolve(false))}
      aoExcluir={aoExcluir}
      consultar={(link) => ({
        titulo: nomeTipo(link.idTipoLink) ?? 'Link acadêmico',
        secoes: [
          {
            titulo: 'URL completa:',
            conteudo: (
              <a href={link.url} target="_blank" rel="noreferrer" className="texto-link break-all">
                {link.url}
              </a>
            ),
          },
          { titulo: 'Rótulo:', conteudo: link.rotulo ?? '(sem rótulo)' },
        ],
      })}
    />
  );
}
