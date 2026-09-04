import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';

// Convenção de código (mesma ideia de REGEX_CHAVE_VALIDA em
// criar-configuracao.jsx) - MAIÚSCULO_COM_UNDERSCORE, igual todo `codigo`
// já seedado (LATTES, ORCID, RESEARCHGATE, LINKEDIN, GITHUB,
// SITE_INSTITUCIONAL, OUTRO - ver 07_seed_dados.sql [07-C-1]). Mesma
// validação de CriarTipoLinkRequestDto (Nest), duplicada aqui só pra dar
// feedback ANTES de bater no backend.
const REGEX_CODIGO_VALIDO = /^[A-Z0-9_]+$/;

function regexValida(padrao) {
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
// "" (ou só espaços/vírgulas) -> [] - dominio é NOT NULL DEFAULT '{}'
// (mecanismo de validação PRINCIPAL, desde a revisão de 16-08-2026),
// array vazio é o único jeito de dizer "sem restrição de domínio", não
// mais `null`.
function paraDominios(texto) {
  return texto
    .split(',')
    .map((valor) => valor.trim())
    .filter(Boolean);
}

export function CriarTipoLink({ auth }) {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [regex, setRegex] = useState('');
  // Texto separado por vírgula na tela ("github.com, gist.github.com"),
  // não um array de verdade - sem componente de "tags" reutilizável no
  // projeto ainda, isto é o jeito mais simples de editar uma lista
  // pequena. Convertido pra array (nunca `null` - array vazio é o
  // default) só na hora de enviar (`aoCriar` abaixo). dominio é o
  // mecanismo de validação PRINCIPAL (array nativo do Postgres, NOT NULL
  // DEFAULT '{}') - um tipo pode aceitar mais de um domínio, ex.: GitHub
  // também responde em gist.github.com.
  const [dominioTexto, setDominioTexto] = useState('');
  // Mesmos defaults do banco (01_extensoes_enums_tabelas.sql) - a maioria
  // dos tipos cadastrados até hoje é só de identidade de perfil (Lattes,
  // ORCID, ResearchGate, LinkedIn), então já começar com permitePerfil
  // marcado poupa o clique mais comum.
  const [permitePerfil, setPermitePerfil] = useState(true);
  const [permiteAtualizacao, setPermiteAtualizacao] = useState(false);
  const [permiteRecompensa, setPermiteRecompensa] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Só valida depois que a pessoa digitou alguma coisa - mesmo raciocínio
  // de chaveInvalida em criar-configuracao.jsx.
  const codigoInvalido = codigo.length > 0 && !REGEX_CODIGO_VALIDO.test(codigo);
  const regexInvalida = regex.length > 0 && !regexValida(regex);
  // CK_TIPO_LINK_ALGUM_ESCOPO (01_extensoes_enums_tabelas.sql) - pelo
  // menos um dos 3 escopos precisa ficar marcado; o service confere isso
  // de novo no backend, isto é só pra travar o botão Criar ANTES de
  // bater lá.
  const nenhumEscopoMarcado = !permitePerfil && !permiteAtualizacao && !permiteRecompensa;

  const aoCriar = async (evento) => {
    evento.preventDefault();
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
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-link"
      titulo="Criar Tipo de Link"
      subtitulo="Preencha os dados abaixo para cadastrar um novo tipo de link."
    >
      <form onSubmit={aoCriar} className="p-10 space-y-6">
        {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

        <div>
          <label className="rotulo-campo">Código</label>
          <input
            type="text"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value.toUpperCase())}
            required
            maxLength={20}
            placeholder="ex.: SITE_INSTITUCIONAL"
            aria-invalid={codigoInvalido}
            className={'input-padrao font-mono' + (codigoInvalido ? ' border-red-500' : '')}
          />
          {codigoInvalido ? (
            <p className="text-xs text-red-600 font-semibold mt-1">
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
            maxLength={100}
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
            className={'input-padrao font-mono' + (regexInvalida ? ' border-red-500' : '')}
          />
          {regexInvalida ? (
            <p className="text-xs text-red-600 font-semibold mt-1">
              Isto não é uma expressão regular válida.
            </p>
          ) : (
            <p className="text-xs texto-fraco mt-1">
              Complemento opcional aos domínios acima - use só quando o domínio sozinho não
              garante uma URL válida (ex.: exigir um perfil específico, não a home do site). Deixe
              em branco quando o domínio já for suficiente.
            </p>
          )}
        </div>


        {/* Escopos - CK_TIPO_LINK_ALGUM_ESCOPO exige pelo menos um
            marcado (trg_valida_escopo_tipolink barra, na hora de gravar
            um link de verdade, qualquer tipo cujo campo correspondente
            aqui seja falso - 05_regras_negocio.sql [05-K-1]). */}
        <div>
          <label className="rotulo-campo">Onde este tipo pode ser usado</label>
          <div className="space-y-2 mt-1">
            <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
              <input
                type="checkbox"
                checked={permitePerfil}
                onChange={(evento) => setPermitePerfil(evento.target.checked)}
              />
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
            <p className="text-xs text-red-600 font-semibold mt-1">
              Pelo menos uma opção precisa ficar marcada.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando || codigoInvalido || regexInvalida || nenhumEscopoMarcado}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>
    </CartaoFormulario>
  );
}
