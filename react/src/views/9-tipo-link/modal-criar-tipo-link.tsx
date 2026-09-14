import { useState } from 'react';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { LIMITE_CODIGO_TIPO_LINK, LIMITE_NOME_TIPO_LINK } from '../../services/9-tipo-link/constants/tipo-link.constants';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';

// Convenção de código - MAIÚSCULO_COM_UNDERSCORE, igual todo `codigo` já
// seedado (LATTES, ORCID, RESEARCHGATE...).
const REGEX_CODIGO_VALIDO = /^[A-Z0-9_]+$/;

function regexValida(padrao: string): boolean {
  if (!padrao) {
    return true;
  }
  try {
    new RegExp(padrao);
    return true;
  } catch {
    return false;
  }
}

// "github.com, gist.github.com" -> ['github.com', 'gist.github.com'];
// "" -> [] - dominio é NOT NULL DEFAULT '{}', array vazio é o único jeito
// de dizer "sem restrição de domínio".
function paraDominios(texto: string): string[] {
  return texto
    .split(',')
    .map((valor) => valor.trim())
    .filter(Boolean);
}

interface ModalCriarTipoLinkProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  aoFechar: () => void;
  aoCriado: (tipoCriado: TipoLinkResponse) => void;
}

// Criar - migrado de página pra modal (14-09-2026, continuação da
// migração CRUD→Modal pedida pelo Lucas).
export function ModalCriarTipoLink({ auth, aoFechar, aoCriado }: ModalCriarTipoLinkProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [regex, setRegex] = useState('');
  const [dominioTexto, setDominioTexto] = useState('');
  const [permitePerfil, setPermitePerfil] = useState(true);
  const [permiteAtualizacao, setPermiteAtualizacao] = useState(false);
  const [permiteRecompensa, setPermiteRecompensa] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const codigoInvalido = codigo.length > 0 && !REGEX_CODIGO_VALIDO.test(codigo);
  const regexInvalida = regex.length > 0 && !regexValida(regex);
  const nenhumEscopoMarcado = !permitePerfil && !permiteAtualizacao && !permiteRecompensa;

  const aoCriar = async () => {
    if (codigoInvalido || regexInvalida || nenhumEscopoMarcado || codigo.trim() === '' || nome.trim() === '') return;
    limparErro();
    setEnviando(true);
    try {
      const tipoCriado = await tipoLinkApi.criar(auth.authFetch, {
        codigo,
        nome,
        ...(regex ? { regex } : {}),
        dominio: paraDominios(dominioTexto),
        permitePerfil,
        permiteAtualizacao,
        permiteRecompensa,
      });
      mostrar(
        'Tipo de link cadastrado com sucesso.',
        `O novo tipo possui o ID: ${tipoCriado.idTipolink}`,
      );
      aoCriado(tipoCriado);
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalFicha
      titulo="Criar Tipo de Link"
      subtitulo="Preencha os dados abaixo para cadastrar um novo tipo de link."
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void aoCriar()}
            disabled={
              enviando || codigoInvalido || regexInvalida || nenhumEscopoMarcado ||
              codigo.trim() === '' || nome.trim() === ''
            }
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <div>
        <label className="rotulo-campo">Código</label>
        <input
          type="text"
          value={codigo}
          onChange={(evento) => setCodigo(evento.target.value.toUpperCase())}
          required
          maxLength={LIMITE_CODIGO_TIPO_LINK}
          placeholder="ex.: SITE_INSTITUCIONAL"
          aria-invalid={codigoInvalido}
          className={'input-padrao font-mono' + (codigoInvalido ? ' borda-erro' : '')}
        />
        {codigoInvalido ? (
          <p className="text-xs texto-erro font-semibold mt-1">
            Só letras maiúsculas, números e underscore - sem espaço, minúscula ou acento.
          </p>
        ) : (
          <p className="text-xs texto-fraco mt-1">
            Identificador interno, nunca editável depois de criado (usado por regras internas
            do sistema - ex.: reconhecer Lattes/ORCID no cálculo de score).
          </p>
        )}
      </div>

      <div>
        <label className="rotulo-campo">Nome</label>
        <input
          type="text"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          required
          maxLength={LIMITE_NOME_TIPO_LINK}
          placeholder="ex.: Site Institucional"
          className="input-padrao"
        />
      </div>

      <div>
        <label className="rotulo-campo">Domínios permitidos</label>
        <input
          type="text"
          value={dominioTexto}
          onChange={(evento) => setDominioTexto(evento.target.value)}
          placeholder="ex.: github.com, gist.github.com"
          className="input-padrao"
        />
        <p className="text-xs texto-fraco mt-1">
          Mecanismo de validação principal: o host da URL precisa estar nesta lista. Um ou mais
          domínios separados por vírgula. Deixe em branco pra aceitar qualquer domínio (ex.:
          "Outro").
        </p>
      </div>

      <div>
        <label className="rotulo-campo">Regex de validação (opcional)</label>
        <input
          type="text"
          value={regex}
          onChange={(evento) => setRegex(evento.target.value)}
          placeholder="ex.: ^https?://(www\.)?github\.com/[\w\-]+/?$"
          aria-invalid={regexInvalida}
          className={'input-padrao font-mono' + (regexInvalida ? ' borda-erro' : '')}
        />
        {regexInvalida ? (
          <p className="text-xs texto-erro font-semibold mt-1">
            Isto não é uma expressão regular válida.
          </p>
        ) : (
          <p className="text-xs texto-fraco mt-1">
            Complemento opcional aos domínios acima - use só quando o domínio sozinho não
            garante uma URL válida. Deixe em branco quando o domínio já for suficiente.
          </p>
        )}
      </div>

      <div>
        <label className="rotulo-campo">Onde este tipo pode ser usado</label>
        <div className="space-y-2 mt-1">
          <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
            <input type="checkbox" checked={permitePerfil} onChange={(evento) => setPermitePerfil(evento.target.checked)} />
            Perfil do pesquisador (links de identidade acadêmica)
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
            <input
              type="checkbox"
              checked={permiteAtualizacao}
              onChange={(evento) => setPermiteAtualizacao(evento.target.checked)}
            />
            Atualização de campanha (prova de progresso)
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
            <input
              type="checkbox"
              checked={permiteRecompensa}
              onChange={(evento) => setPermiteRecompensa(evento.target.checked)}
            />
            Recompensa (ex.: acesso antecipado a um repositório)
          </label>
        </div>
        {nenhumEscopoMarcado && (
          <p className="text-xs texto-erro font-semibold mt-1">
            Pelo menos uma opção precisa ficar marcada.
          </p>
        )}
      </div>
    </ModalFicha>
  );
}
