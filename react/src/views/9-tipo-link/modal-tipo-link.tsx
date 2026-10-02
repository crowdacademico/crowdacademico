import { useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { ModalExcluirItem } from '../../components/crud/modal-excluir-item';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { CaixaMarcacao } from '../../components/input/caixa-marcacao';
import { EscoposTipoLink } from './escopos-tipo-link';
import { TesteLinkTipo } from './teste-link-tipo';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import {
  DICA_DOMINIOS_TIPO_LINK,
  DICA_REGEX_TIPO_LINK,
  LIMITE_NOME_TIPO_LINK,
  paraDominios,
  regexValida,
} from '../../services/9-tipo-link/constants/tipo-link.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';

// Consultar/Alterar/Excluir em modal: recebem a linha (`tipo: TipoLinkResponse`) inteira do chamador, mesmo
// motivo de modal-motivo-denuncia.tsx. Criar fica em arquivo separado.

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
        <RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />
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
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [nome, setNome] = useState(tipo.nome);
  const [ativo, setAtivo] = useState(tipo.ativo);
  const [regex, setRegex] = useState(tipo.regex ?? '');
  const [dominioTexto, setDominioTexto] = useState(tipo.dominio.join(', '));
  const [permitePerfil, setPermitePerfil] = useState(tipo.permitePerfil);
  const [permiteAtualizacao, setPermiteAtualizacao] = useState(tipo.permiteAtualizacao);
  const [permiteRecompensa, setPermiteRecompensa] = useState(tipo.permiteRecompensa);

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
  const nenhumEscopoMarcado = !permitePerfil && !permiteAtualizacao && !permiteRecompensa;

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoFechar();
  };

  // "Salvar" só espera haver alteração; nome apagado, regex inválida e nenhuma opção marcada mostram o erro no campo.
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({ nome: nome.trim() === '' && 'Informe o nome.' }));

  const aoSalvar = async () => {
    if (!tentarEnviar() || regexInvalida || nenhumEscopoMarcado) return;
    await executarEnviando(async () => {
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
    });
  };

  return (
    <ModalFicha
      titulo={`Alterar "${tipo.nome}"`}
      aoFechar={fechar}
      rodape={
        <RodapeAcoes
          aoCancelar={fechar}
          acao={{
            rotulo: 'Salvar',
            rotuloOcupado: 'Salvando...',
            ocupado: enviando,
            desabilitado: !sujo,
            aoClicar: () => void aoSalvar(),
          }}
        />
      }
      erro={erro}
    >
      <SecaoFicha titulo="Dados">
        <CampoSomenteLeitura rotulo="Código" valor={tipo.codigo} />
      </SecaoFicha>

      <SecaoFicha titulo="Editar">
        <Campo rotulo="Nome" erro={erroDe('nome') ?? errosCampo.nome} className="sm:col-span-2">
          {({ atributos, classeErro }) => (
            <input
              {...atributos}
              type="text"
              value={nome}
              onChange={(evento) => {
                setNome(evento.target.value);
                limparErroCampo('nome');
              }}
              required
              maxLength={LIMITE_NOME_TIPO_LINK}
              className={'input-padrao' + classeErro}
            />
          )}
        </Campo>

        <Campo
          rotulo="Domínios permitidos"
          erro={errosCampo.dominio}
          dica={DICA_DOMINIOS_TIPO_LINK}
          className="sm:col-span-2"
        >
          {({ atributos, classeErro }) => (
            <input
              {...atributos}
              type="text"
              value={dominioTexto}
              onChange={(evento) => {
                setDominioTexto(evento.target.value);
                limparErroCampo('dominio');
              }}
              placeholder="ex.: github.com, gist.github.com"
              className={'input-padrao' + classeErro}
            />
          )}
        </Campo>

        <Campo
          rotulo="Regex de validação (opcional)"
          erro={regexInvalida ? 'Isto não é uma expressão regular válida.' : errosCampo.regex}
          dica={DICA_REGEX_TIPO_LINK}
          className="sm:col-span-2"
        >
          {({ atributos, classeErro }) => (
            <input
              {...atributos}
              type="text"
              value={regex}
              onChange={(evento) => {
                setRegex(evento.target.value);
                limparErroCampo('regex');
              }}
              className={'input-padrao input-padrao--codigo' + classeErro}
            />
          )}
        </Campo>

        <div className="sm:col-span-2">
          <TesteLinkTipo dominioTexto={dominioTexto} regex={regex} />
        </div>

        <CaixaMarcacao rotulo="Ativo" marcado={ativo} aoMudar={setAtivo} className="sm:col-span-2" />

        <EscoposTipoLink
          className="sm:col-span-2"
          permitePerfil={permitePerfil}
          permiteAtualizacao={permiteAtualizacao}
          permiteRecompensa={permiteRecompensa}
          aoMudarPerfil={setPermitePerfil}
          aoMudarAtualizacao={setPermiteAtualizacao}
          aoMudarRecompensa={setPermiteRecompensa}
        />
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
  return (
    <ModalExcluirItem
      nome={tipo.nome}
      campos={
        <>
          <CampoFicha rotulo="Código" valor={tipo.codigo} />
          <CampoFicha rotulo="Nome" valor={tipo.nome} largura="cheia" />
        </>
      }
      explicacao="Se este tipo ainda estiver em uso em algum perfil, atualização de campanha ou recompensa, a exclusão é bloqueada pelo próprio banco: desative-o em vez de excluir. Se não estiver em uso, some do catálogo pra sempre, sem exclusão lógica."
      remover={() => tipoLinkApi.remover(auth.authFetch, tipo.idTipolink)}
      mensagemSucesso="Tipo de link excluído com sucesso."
      detalheSucesso={`ID: ${tipo.idTipolink} foi excluído`}
      aoFechar={aoFechar}
      aoExcluido={aoExcluido}
    />
  );
}
