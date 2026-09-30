import { useState } from 'react';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { EscoposTipoLink } from './escopos-tipo-link';
import { TesteLinkTipo } from './teste-link-tipo';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import {
  DICA_DOMINIOS_TIPO_LINK,
  DICA_REGEX_TIPO_LINK,
  LIMITE_CODIGO_TIPO_LINK,
  LIMITE_NOME_TIPO_LINK,
  paraDominios,
  REGEX_CODIGO_TIPO_LINK,
  regexValida,
} from '../../services/9-tipo-link/constants/tipo-link.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';

interface ModalCriarTipoLinkProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  aoFechar: () => void;
  aoCriado: (tipoCriado: TipoLinkResponse) => void;
}

// Criar em modal.
export function ModalCriarTipoLink({ auth, aoFechar, aoCriado }: ModalCriarTipoLinkProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [regex, setRegex] = useState('');
  const [dominioTexto, setDominioTexto] = useState('');
  const [permitePerfil, setPermitePerfil] = useState(true);
  const [permiteAtualizacao, setPermiteAtualizacao] = useState(false);
  const [permiteRecompensa, setPermiteRecompensa] = useState(false);

  const codigoInvalido = codigo.length > 0 && !REGEX_CODIGO_TIPO_LINK.test(codigo);
  const regexInvalida = regex.length > 0 && !regexValida(regex);
  const nenhumEscopoMarcado = !permitePerfil && !permiteAtualizacao && !permiteRecompensa;

  // "Criar" fica sempre clicável: clicando com algo faltando, cada campo mostra o próprio erro. Formato do código, regex
  // e "pelo menos uma opção" já aparecem enquanto se preenche.
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    codigo: codigo.trim() === '' && 'Informe o código.',
    nome: nome.trim() === '' && 'Informe o nome.',
  }));

  const aoCriar = async () => {
    if (!tentarEnviar() || codigoInvalido || regexInvalida || nenhumEscopoMarcado) return;
    await executarEnviando(async () => {
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
    });
  };

  // Criar também pergunta antes de fechar com algo digitado, como o Alterar.
  const sujo = codigo !== '' || nome !== '' || regex !== '' || dominioTexto !== '' || !permitePerfil || permiteAtualizacao || permiteRecompensa;
  useAvisoAlteracaoNaoSalva(sujo);
  const fechar = () => {
    if (confirmarSaida(sujo)) aoFechar();
  };

  return (
    <ModalFicha
      titulo="Criar Tipo de Link"
      subtitulo="Preencha os dados abaixo para cadastrar um novo tipo de link."
      aoFechar={fechar}
      rodape={
        <RodapeAcoes
          aoCancelar={fechar}
          acao={{
            rotulo: 'Criar',
            rotuloOcupado: 'Criando...',
            ocupado: enviando,
            aoClicar: () => void aoCriar(),
          }}
        />
      }
      erro={erro}
    >
      <Campo
        rotulo="Código"
        erro={
          codigoInvalido
            ? 'Só letras maiúsculas, números e underscore, sem espaço, minúscula ou acento.'
            : (erroDe('codigo') ?? errosCampo.codigo)
        }
        dica="Identificador interno, nunca editável depois de criado (usado por regras internas do sistema, ex.: reconhecer Lattes/ORCID no cálculo de score)."
      >
        {({ atributos, classeErro }) => (
          <input
            {...atributos}
            type="text"
            value={codigo}
            onChange={(evento) => {
              setCodigo(evento.target.value.toUpperCase());
              limparErroCampo('codigo');
            }}
            required
            maxLength={LIMITE_CODIGO_TIPO_LINK}
            placeholder="ex.: SITE_INSTITUCIONAL"
            className={'input-padrao font-mono' + classeErro}
          />
        )}
      </Campo>

      <Campo rotulo="Nome" erro={erroDe('nome') ?? errosCampo.nome}>
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
            placeholder="ex.: Site Institucional"
            className={'input-padrao' + classeErro}
          />
        )}
      </Campo>

      <Campo rotulo="Domínios permitidos" erro={errosCampo.dominio} dica={DICA_DOMINIOS_TIPO_LINK}>
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
            placeholder="ex.: ^https?://(www\.)?github\.com/[\w\-]+/?$"
            className={'input-padrao font-mono' + classeErro}
          />
        )}
      </Campo>

      <TesteLinkTipo dominioTexto={dominioTexto} regex={regex} />

      <EscoposTipoLink
        permitePerfil={permitePerfil}
        permiteAtualizacao={permiteAtualizacao}
        permiteRecompensa={permiteRecompensa}
        aoMudarPerfil={setPermitePerfil}
        aoMudarAtualizacao={setPermiteAtualizacao}
        aoMudarRecompensa={setPermiteRecompensa}
      />
    </ModalFicha>
  );
}
