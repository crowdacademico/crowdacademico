import { useId, useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { LIMITE_NOME_TIPO_LINK } from '../../services/9-tipo-link/constants/tipo-link.constants';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';

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

function paraDominios(texto: string): string[] {
  return texto
    .split(',')
    .map((valor) => valor.trim())
    .filter(Boolean);
}

// Consultar/Alterar/Excluir migrados de página pra modal (14-09-2026,
// continuação da migração CRUD→Modal pedida pelo Lucas) - recebem a linha
// (`tipo: TipoLinkResponse`) inteira do chamador, mesmo motivo de
// modal-motivo-denuncia.tsx. Criar fica em arquivo separado.

interface ModalConsultarTipoLinkProps {
  tipo: TipoLinkResponse;
  aoFechar: () => void;
}

export function ModalConsultarTipoLink({ tipo, aoFechar }: ModalConsultarTipoLinkProps) {
  // Rótulos dos escopos marcados (CK_TIPO_LINK_ALGUM_ESCOPO garante pelo
  // menos 1) - vira badge por escopo, mais rápido de ler "onde isto pode
  // ser usado" de relance.
  const escopos = [
    tipo.permitePerfil && 'Perfil',
    tipo.permiteAtualizacao && 'Atualização',
    tipo.permiteRecompensa && 'Recompensa',
  ].filter((escopo): escopo is string => Boolean(escopo));

  return (
    <ModalFicha
      titulo={tipo.nome}
      subtitulo={tipo.codigo}
      badges={[
        <BadgeBooleano key="ativo" valor={tipo.ativo} rotuloTrue="Ativo" rotuloFalse="Inativo" />,
        ...escopos.map((escopo) => (
          <span key={escopo} className="badge badge-neutro">
            {escopo}
          </span>
        )),
      ]}
      aoFechar={aoFechar}
      rodape={
        <button type="button" onClick={aoFechar} className="btn btn-secondary w-full max-w-sm ml-auto">
          Fechar
        </button>
      }
    >
      <SecaoFicha titulo="Dados">
        <CampoFicha rotulo="id" valor={tipo.idTipolink} />
        <CampoFicha rotulo="Código" valor={tipo.codigo} />
        <CampoFicha rotulo="Nome" valor={tipo.nome} largura="cheia" />
        <CampoFicha
          rotulo="Domínios permitidos"
          valor={tipo.dominio.length ? tipo.dominio.join(', ') : null}
          largura="cheia"
        />
        <CampoFicha rotulo="Regex de validação" valor={tipo.regex} largura="cheia" />
      </SecaoFicha>
    </ModalFicha>
  );
}

interface ModalAlterarTipoLinkProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  tipo: TipoLinkResponse;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

// `codigo` não aparece editável (só leitura) porque AtualizarTipoLinkRequestDto
// (Nest) não o aceita - é a chave estável que calcular_score_perfil_
// academico() lê pra reconhecer Lattes/ORCID.
export function ModalAlterarTipoLink({ auth, tipo, aoFechar, aoAtualizado }: ModalAlterarTipoLinkProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [nome, setNome] = useState(tipo.nome);
  const [ativo, setAtivo] = useState(tipo.ativo);
  const [regex, setRegex] = useState(tipo.regex ?? '');
  const [dominioTexto, setDominioTexto] = useState(tipo.dominio.join(', '));
  const [permitePerfil, setPermitePerfil] = useState(tipo.permitePerfil);
  const [permiteAtualizacao, setPermiteAtualizacao] = useState(tipo.permiteAtualizacao);
  const [permiteRecompensa, setPermiteRecompensa] = useState(tipo.permiteRecompensa);
  const [enviando, setEnviando] = useState(false);

  const sujo =
    nome !== tipo.nome ||
    ativo !== tipo.ativo ||
    regex !== (tipo.regex ?? '') ||
    dominioTexto !== tipo.dominio.join(', ') ||
    permitePerfil !== tipo.permitePerfil ||
    permiteAtualizacao !== tipo.permiteAtualizacao ||
    permiteRecompensa !== tipo.permiteRecompensa;
  useAvisoAlteracaoNaoSalva(sujo);

  const regexInvalida = regex.length > 0 && !regexValida(regex);
  // aria-describedby (23-09-2026): ver modal-criar-area-conhecimento.tsx.
  const idMensagemRegex = useId();
  const nenhumEscopoMarcado = !permitePerfil && !permiteAtualizacao && !permiteRecompensa;

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoFechar();
  };

  const aoSalvar = async () => {
    limparErro();
    setEnviando(true);
    try {
      await tipoLinkApi.atualizar(auth.authFetch, tipo.idTipolink, {
        nome,
        ativo,
        regex: regex || null,
        dominio: paraDominios(dominioTexto),
        permitePerfil,
        permiteAtualizacao,
        permiteRecompensa,
      });
      mostrar('Tipo de link alterado com sucesso.', `ID: ${tipo.idTipolink} foi alterado`);
      aoAtualizado();
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalFicha
      titulo={`Alterar "${tipo.nome}"`}
      aoFechar={fechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={fechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void aoSalvar()}
            disabled={enviando || !sujo || regexInvalida || nenhumEscopoMarcado || nome.trim() === ''}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

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
            maxLength={LIMITE_NOME_TIPO_LINK}
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
            mais domínios separados por vírgula. Deixe em branco pra aceitar qualquer domínio.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="rotulo-campo">Regex de validação (opcional)</label>
          <input
            type="text"
            value={regex}
            onChange={(evento) => setRegex(evento.target.value)}
            aria-invalid={regexInvalida}
            aria-describedby={idMensagemRegex}
            className={'input-padrao font-mono' + (regexInvalida ? ' borda-erro' : '')}
          />
          {regexInvalida ? (
            <p id={idMensagemRegex} className="text-xs texto-erro font-semibold mt-1">
              Isto não é uma expressão regular válida.
            </p>
          ) : (
            <p id={idMensagemRegex} className="text-xs texto-fraco mt-1">
              Complemento opcional aos domínios acima. Deixe em branco quando o domínio já for
              suficiente.
            </p>
          )}
        </div>

        <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold texto-padrao">
          <input type="checkbox" checked={ativo} onChange={(evento) => setAtivo(evento.target.checked)} />
          Ativo
        </label>

        <div className="sm:col-span-2">
          <span className="rotulo-campo">Onde este tipo pode ser usado</span>
          <div className="space-y-2 mt-1">
            <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
              <input type="checkbox" checked={permitePerfil} onChange={(evento) => setPermitePerfil(evento.target.checked)} />
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
            <p className="text-xs texto-erro font-semibold mt-1">
              Pelo menos uma opção precisa ficar marcada.
            </p>
          )}
        </div>
      </SecaoFicha>
    </ModalFicha>
  );
}

interface ModalExcluirTipoLinkProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  tipo: TipoLinkResponse;
  aoFechar: () => void;
  aoExcluido: () => void;
}

export function ModalExcluirTipoLink({ auth, tipo, aoFechar, aoExcluido }: ModalExcluirTipoLinkProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await tipoLinkApi.remover(auth.authFetch, tipo.idTipolink);
      mostrar('Tipo de link excluído com sucesso.', `ID: ${tipo.idTipolink} foi excluído`);
      aoExcluido();
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <ModalFicha
      titulo={`Excluir "${tipo.nome}"`}
      subtitulo="Esta ação não pode ser desfeita."
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void excluir()}
            disabled={excluindo}
            className="btn btn-danger flex-1"
          >
            {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <SecaoFicha titulo="O que será excluído">
        <CampoFicha rotulo="Código" valor={tipo.codigo} />
        <CampoFicha rotulo="Nome" valor={tipo.nome} largura="cheia" />
      </SecaoFicha>

      <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
        <p className="font-bold mb-1">
          <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
        </p>
        <p>
          Se este tipo ainda estiver em uso em algum perfil, atualização de campanha ou
          recompensa, a exclusão é bloqueada pelo próprio banco - desative-o em vez de excluir.
          Se não estiver em uso, some do catálogo pra sempre, sem exclusão lógica.
        </p>
      </div>
    </ModalFicha>
  );
}
