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
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { LIMITE_NOME_AREA_CONHECIMENTO } from '../../services/8-area-conhecimento/constants/area-conhecimento.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { AreaConhecimentoResponse } from '../../services/8-area-conhecimento/type/area-conhecimento.type';

// Consultar/Alterar/Excluir em modal: recebem a linha (`area: AreaConhecimentoResponse`) inteira do chamador,
// mesmo motivo de modal-motivo-denuncia.tsx. Criar fica em arquivo separado.
//
// `nomePaiExibido`: listar-areas-conhecimento.tsx transforma `nomePai` para as 9 raízes ("Base, <nome>", para o
// filtro por faceta reconhecer a própria linha) antes de entregar a linha ao GenericTable, e é essa linha
// TRANSFORMADA que chega aqui via `aoConsultar`/`aoAlterar`/`aoExcluir`. Mostrar `area.nomePai` direto exibiria
// "Base, ..." para uma raiz, errado para o contexto do modal: a mesma lógica que a própria coluna da tabela usa
// (`renderizar`, ver listar-areas-conhecimento.tsx) decide o texto certo a partir de `idPai`, não de `nomePai`
// cru.
function nomePaiExibido(area: AreaConhecimentoResponse): string | null {
  return area.idPai === null ? null : area.nomePai;
}

interface ModalConsultarAreaConhecimentoProps {
  area: AreaConhecimentoResponse;
  aoFechar: () => void;
}

export function ModalConsultarAreaConhecimento({ area, aoFechar }: ModalConsultarAreaConhecimentoProps) {
  return (
    <ModalFicha
      titulo={area.nome}
      subtitulo={area.codigoCnpq}
      badges={[
        <BadgeBooleano key="ativo" valor={area.ativo} rotuloTrue="Ativo" rotuloFalse="Inativo" />,
        <span key="nivel" className="badge badge-neutro">
          {area.idPai ? 'Área (nível 2)' : 'Grande área (raiz)'}
        </span>,
      ]}
      aoFechar={aoFechar}
      rodape={
        <RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />
      }
    >
      <SecaoFicha titulo="Dados">
        <CampoFicha rotulo="id" valor={area.idAreaConhecimento} />
        <CampoFicha rotulo="Código CNPq" valor={area.codigoCnpq} />
        <CampoFicha rotulo="Nome" valor={area.nome} largura="cheia" />
        <CampoFicha rotulo="Grande área (pai)" valor={nomePaiExibido(area)} largura="cheia" />
      </SecaoFicha>
    </ModalFicha>
  );
}

interface ModalAlterarAreaConhecimentoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  area: AreaConhecimentoResponse;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

// `codigoCnpq`/"Grande área (pai)" não aparecem editáveis (só leitura) -
// mesmo motivo de sempre: AtualizarAreaConhecimentoRequestDto (Nest) não
// os aceita, só nome/ativo podem mudar.
export function ModalAlterarAreaConhecimento({ auth, area, aoFechar, aoAtualizado }: ModalAlterarAreaConhecimentoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [nome, setNome] = useState(area.nome);
  const [ativo, setAtivo] = useState(area.ativo);

  const sujo = nome !== area.nome || ativo !== area.ativo;
  useAvisoAlteracaoNaoSalva(sujo);

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoFechar();
  };

  // "Salvar" só espera haver alteração; com o campo obrigatório apagado, o erro aparece embaixo dele.
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({ nome: nome.trim() === '' && 'Informe o nome.' }));

  const aoSalvar = async () => {
    if (!tentarEnviar()) return;
    await executarEnviando(async () => {
      await areaConhecimentoApi.atualizar(auth.authFetch, area.idAreaConhecimento, { nome, ativo });
      mostrar('Área de conhecimento alterada com sucesso.', `ID: ${area.idAreaConhecimento} foi alterada`);
      aoAtualizado();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Alterar "${area.nome}"`}
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
        <CampoSomenteLeitura rotulo="Código CNPq" valor={area.codigoCnpq} />
        <CampoSomenteLeitura rotulo="Grande área (pai)" valor={nomePaiExibido(area) ?? 'Nenhuma (é uma grande área raiz)'} />
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
              maxLength={LIMITE_NOME_AREA_CONHECIMENTO}
              className={'input-padrao' + classeErro}
            />
          )}
        </Campo>

        <CaixaMarcacao rotulo="Ativo" marcado={ativo} aoMudar={setAtivo} className="sm:col-span-2" />
      </SecaoFicha>
    </ModalFicha>
  );
}

interface ModalExcluirAreaConhecimentoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  area: AreaConhecimentoResponse;
  aoFechar: () => void;
  aoExcluido: () => void;
}

export function ModalExcluirAreaConhecimento({ auth, area, aoFechar, aoExcluido }: ModalExcluirAreaConhecimentoProps) {
  return (
    <ModalExcluirItem
      nome={area.nome}
      campos={
        <>
          <CampoFicha rotulo="Código CNPq" valor={area.codigoCnpq} />
          <CampoFicha rotulo="Nome" valor={area.nome} largura="cheia" />
          <CampoFicha rotulo="Grande área (pai)" valor={nomePaiExibido(area)} largura="cheia" />
        </>
      }
      explicacao="Se esta área ainda estiver vinculada a alguma campanha (ou a outra área filha), a exclusão é bloqueada pelo próprio banco: desative-a em vez de excluir. Se não estiver em uso, some do catálogo pra sempre, sem exclusão lógica."
      remover={() => areaConhecimentoApi.remover(auth.authFetch, area.idAreaConhecimento)}
      mensagemSucesso="Área de conhecimento excluída com sucesso."
      detalheSucesso={`ID: ${area.idAreaConhecimento} foi excluído`}
      aoFechar={aoFechar}
      aoExcluido={aoExcluido}
    />
  );
}
