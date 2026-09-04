import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';

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
// mais `null`. Mesma função de criar-tipo-link.jsx, duplicada aqui - cada
// view deste módulo fica autocontida, mesmo padrão do resto do projeto.
function paraDominios(texto) {
  return texto
    .split(',')
    .map((valor) => valor.trim())
    .filter(Boolean);
}

// `codigo` não aparece como campo editável (só leitura) porque
// AtualizarTipoLinkRequestDto (Nest) não o aceita - é a chave estável que
// calcular_score_perfil_academico() lê pra reconhecer Lattes/ORCID (mesmo
// raciocínio de AlterarPapel sobre `papel.codigo`/AlterarAreaConhecimento
// sobre `codigoCnpq`). Todo o resto pode mudar.
export function AlterarTipoLink({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [tipo, setTipo] = useState(null);
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [regex, setRegex] = useState('');
  // Texto separado por vírgula na tela (ver paraDominios acima) -
  // `dominio` é o mecanismo de validação PRINCIPAL (array nativo do
  // Postgres, NOT NULL DEFAULT '{}'), mas não existe componente de "tags"
  // reutilizável no projeto ainda.
  const [dominioTexto, setDominioTexto] = useState('');
  const [permitePerfil, setPermitePerfil] = useState(true);
  const [permiteAtualizacao, setPermiteAtualizacao] = useState(false);
  const [permiteRecompensa, setPermiteRecompensa] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    tipoLinkApi
      .buscar(auth.authFetch, id)
      .then((dados) => {
        setTipo(dados);
        setNome(dados.nome);
        setAtivo(dados.ativo);
        setRegex(dados.regex ?? '');
        setDominioTexto(dados.dominio.join(', '));
        setPermitePerfil(dados.permitePerfil);
        setPermiteAtualizacao(dados.permiteAtualizacao);
        setPermiteRecompensa(dados.permiteRecompensa);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sujo =
    tipo !== null &&
    (nome !== tipo.nome ||
      ativo !== tipo.ativo ||
      regex !== (tipo.regex ?? '') ||
      dominioTexto !== tipo.dominio.join(', ') ||
      permitePerfil !== tipo.permitePerfil ||
      permiteAtualizacao !== tipo.permiteAtualizacao ||
      permiteRecompensa !== tipo.permiteRecompensa);
  useAvisoAlteracaoNaoSalva(sujo);

  const regexInvalida = regex.length > 0 && !regexValida(regex);
  // CK_TIPO_LINK_ALGUM_ESCOPO (01_extensoes_enums_tabelas.sql) - mesma
  // checagem de CriarTipoLink, travando o botão Salvar ANTES de bater no
  // backend.
  const nenhumEscopoMarcado = !permitePerfil && !permiteAtualizacao && !permiteRecompensa;

  const aoCancelar = () => {
    if (sujo && !window.confirm('Você tem alterações não salvas. Sair mesmo assim?')) {
      return;
    }
    navigate(-1);
  };

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      await tipoLinkApi.atualizar(auth.authFetch, id, {
        nome,
        ativo,
        // '' vira `null` (limpa o campo) - regex é NULLABLE e
        // AtualizarTipoLinkRequestDto (Nest) aceita `null` explícito no
        // corpo pra isto. dominio NUNCA é `null` (NOT NULL DEFAULT '{}'
        // no banco) - array vazio já é o "limpo" por natureza, sem
        // precisar de fallback nenhum.
        regex: regex || null,
        dominio: paraDominios(dominioTexto),
        permitePerfil,
        permiteAtualizacao,
        permiteRecompensa,
      });
      mostrar('Tipo de link alterado com sucesso.', `ID: ${id} foi alterado`);
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
      titulo="Alterar Tipo de Link"
      rodape={
        tipo && (
          <div className="flex gap-3">
            <button type="button" onClick={aoCancelar} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              form="form-alterar-tipo-link"
              disabled={enviando || !sujo || regexInvalida || nenhumEscopoMarcado}
              className="btn btn-primary flex-1"
            >
              {enviando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )
      }
    >
      {carregando ? (
        <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>
      ) : !tipo ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <form id="form-alterar-tipo-link" onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <div className="flex items-center gap-3 pb-4 border-b borda-padrao">
            <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
              <i className="fa-solid fa-link"></i>
            </div>
            <div className="min-w-0">
              <p className="font-bold texto-forte truncate font-mono text-sm">{tipo.codigo}</p>
              <p className="text-xs texto-fraco">Tipo de link #{tipo.idTipolink}</p>
            </div>
          </div>

          <SecaoFicha titulo="Dados">
            <CampoSomenteLeitura rotulo="Código" valor={tipo.codigo} />
          </SecaoFicha>

          <SecaoFicha titulo="Editar">
            <div className="sm:col-span-2">
              <label className="rotulo-campo">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                required
                maxLength={100}
                className="input-padrao"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="rotulo-campo">Domínios permitidos</label>
              <input
                type="text"
                value={dominioTexto}
                onChange={(evento) => setDominioTexto(evento.target.value)}
                placeholder="ex.: github.com, gist.github.com"
                className="input-padrao"
              />
              <p className="text-xs texto-fraco mt-1">
                Mecanismo de validação principal: o host da URL precisa estar nesta lista. Um ou
                mais domínios separados por vírgula. Deixe em branco pra aceitar qualquer
                domínio.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="rotulo-campo">Regex de validação (opcional)</label>
              <input
                type="text"
                value={regex}
                onChange={(evento) => setRegex(evento.target.value)}
                aria-invalid={regexInvalida}
                className={'input-padrao font-mono' + (regexInvalida ? ' border-red-500' : '')}
              />
              {regexInvalida ? (
                <p className="text-xs text-red-600 font-semibold mt-1">
                  Isto não é uma expressão regular válida.
                </p>
              ) : (
                <p className="text-xs texto-fraco mt-1">
                  Complemento opcional aos domínios acima. Deixe em branco quando o domínio já for
                  suficiente.
                </p>
              )}
            </div>


            <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold texto-padrao">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(evento) => setAtivo(evento.target.checked)}
              />
              Ativo
            </label>

            <div className="sm:col-span-2">
              <span className="rotulo-campo">Onde este tipo pode ser usado</span>
              <div className="space-y-2 mt-1">
                <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
                  <input
                    type="checkbox"
                    checked={permitePerfil}
                    onChange={(evento) => setPermitePerfil(evento.target.checked)}
                  />
                  Perfil do pesquisador
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
                  <input
                    type="checkbox"
                    checked={permiteAtualizacao}
                    onChange={(evento) => setPermiteAtualizacao(evento.target.checked)}
                  />
                  Atualização de campanha
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
                  <input
                    type="checkbox"
                    checked={permiteRecompensa}
                    onChange={(evento) => setPermiteRecompensa(evento.target.checked)}
                  />
                  Recompensa
                </label>
              </div>
              {nenhumEscopoMarcado && (
                <p className="text-xs text-red-600 font-semibold mt-1">
                  Pelo menos uma opção precisa ficar marcada.
                </p>
              )}
            </div>
          </SecaoFicha>
        </form>
      )}
    </CartaoFormulario>
  );
}
