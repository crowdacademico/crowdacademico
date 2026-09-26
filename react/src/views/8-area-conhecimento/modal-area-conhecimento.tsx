import { useId, useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { LIMITE_NOME_AREA_CONHECIMENTO } from '../../services/8-area-conhecimento/constants/area-conhecimento.constants';
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
        <button type="button" onClick={aoFechar} className="btn btn-secondary w-full max-w-sm ml-auto">
          Fechar
        </button>
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
  const { erro, reportarErro, limparErro } = useErroToast();
  const [nome, setNome] = useState(area.nome);
  const [ativo, setAtivo] = useState(area.ativo);
  const [enviando, setEnviando] = useState(false);
  const idNome = useId();

  const sujo = nome !== area.nome || ativo !== area.ativo;
  useAvisoAlteracaoNaoSalva(sujo);

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
      await areaConhecimentoApi.atualizar(auth.authFetch, area.idAreaConhecimento, { nome, ativo });
      mostrar('Área de conhecimento alterada com sucesso.', `ID: ${area.idAreaConhecimento} foi alterada`);
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
      titulo={`Alterar "${area.nome}"`}
      aoFechar={fechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={fechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void aoSalvar()}
            disabled={enviando || !sujo || nome.trim() === ''}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <SecaoFicha titulo="Dados">
        <CampoSomenteLeitura rotulo="Código CNPq" valor={area.codigoCnpq} />
        <CampoSomenteLeitura rotulo="Grande área (pai)" valor={nomePaiExibido(area) ?? 'Nenhuma (é uma grande área raiz)'} />
      </SecaoFicha>

      <SecaoFicha titulo="Editar">
        <div className="sm:col-span-2">
          <label htmlFor={idNome} className="rotulo-campo">Nome</label>
          <input
            id={idNome}
            type="text"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            required
            maxLength={LIMITE_NOME_AREA_CONHECIMENTO}
            className="input-padrao"
          />
        </div>

        <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold texto-padrao">
          <input type="checkbox" checked={ativo} onChange={(evento) => setAtivo(evento.target.checked)} />
          Ativo
        </label>
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
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await areaConhecimentoApi.remover(auth.authFetch, area.idAreaConhecimento);
      mostrar('Área de conhecimento excluída com sucesso.', `ID: ${area.idAreaConhecimento} foi excluído`);
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
      titulo={`Excluir "${area.nome}"`}
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
        <CampoFicha rotulo="Código CNPq" valor={area.codigoCnpq} />
        <CampoFicha rotulo="Nome" valor={area.nome} largura="cheia" />
        <CampoFicha rotulo="Grande área (pai)" valor={nomePaiExibido(area)} largura="cheia" />
      </SecaoFicha>

      <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
        <p className="font-bold mb-1">
          <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
        </p>
        <p>
          Se esta área ainda estiver vinculada a alguma campanha (ou a outra área filha), a
          exclusão é bloqueada pelo próprio banco - desative-a em vez de excluir. Se não estiver
          em uso, some do catálogo pra sempre, sem exclusão lógica.
        </p>
      </div>
    </ModalFicha>
  );
}
