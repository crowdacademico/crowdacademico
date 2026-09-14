import { useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import {
  ehTipoMotivoDenuncia,
  LIMITE_DESCRICAO_MOTIVO_DENUNCIA,
  ROTULO_TIPO_MOTIVO_DENUNCIA as ROTULO_TIPO,
} from '../../services/10-motivo-denuncia/constants/motivo-denuncia.constants';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { MotivoDenunciaResponse, TipoMotivoDenuncia } from '../../services/10-motivo-denuncia/type/motivo-denuncia.type';

// Consultar/Alterar/Excluir migrados de página pra modal (14-09-2026,
// continuação da migração CRUD→Modal pedida pelo Lucas). Recebem a linha
// (`motivo: MotivoDenunciaResponse`) inteira do chamador - o `GenericTable`
// já tem o dado completo em memória (`aoAlterar`/`aoConsultar`/`aoExcluir`
// recebem `linha: T`), não precisa refazer a busca por id como
// ModalAlterarUsuario faz (que precisa de MUITO mais dado do que a linha da
// tabela tem). Criar fica em arquivo separado (modal-criar-motivo-
// denuncia.tsx), mesmo padrão de modal-usuario.tsx/modal-criar-usuario.tsx.

interface ModalConsultarMotivoDenunciaProps {
  motivo: MotivoDenunciaResponse;
  aoFechar: () => void;
}

export function ModalConsultarMotivoDenuncia({ motivo, aoFechar }: ModalConsultarMotivoDenunciaProps) {
  return (
    <ModalFicha
      titulo={motivo.descricao}
      badges={[
        <BadgeBooleano key="ativo" valor={motivo.ativo} rotuloTrue="Ativo" rotuloFalse="Inativo" />,
        <span key="tipo" className="badge badge-neutro">
          {ROTULO_TIPO[motivo.tipo]}
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
        <CampoFicha rotulo="id" valor={motivo.idMotivo} />
        <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO[motivo.tipo]} />
        <CampoFicha rotulo="Descrição" valor={motivo.descricao} largura="cheia" />
      </SecaoFicha>
    </ModalFicha>
  );
}

interface ModalAlterarMotivoDenunciaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  motivo: MotivoDenunciaResponse;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

export function ModalAlterarMotivoDenuncia({ auth, motivo, aoFechar, aoAtualizado }: ModalAlterarMotivoDenunciaProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [descricao, setDescricao] = useState(motivo.descricao);
  const [tipo, setTipo] = useState<TipoMotivoDenuncia>(motivo.tipo);
  const [ativo, setAtivo] = useState(motivo.ativo);
  const [enviando, setEnviando] = useState(false);

  const sujo = descricao !== motivo.descricao || tipo !== motivo.tipo || ativo !== motivo.ativo;
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
      await motivoDenunciaApi.atualizar(auth.authFetch, motivo.idMotivo, { descricao, tipo, ativo });
      mostrar('Motivo de denúncia alterado com sucesso.', `ID: ${motivo.idMotivo} foi alterado`);
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
      titulo={`Alterar "${motivo.descricao}"`}
      aoFechar={fechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={fechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void aoSalvar()}
            disabled={enviando || !sujo || descricao.trim() === ''}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <SecaoFicha titulo="Editar">
        <div className="sm:col-span-2">
          <label className="rotulo-campo">Tipo</label>
          <select
            value={tipo}
            onChange={(evento) => {
              if (ehTipoMotivoDenuncia(evento.target.value)) {
                setTipo(evento.target.value);
              }
            }}
            required
            className="input-padrao"
          >
            <option value="campanha">Campanha</option>
            <option value="perfil">Perfil</option>
          </select>
          <p className="text-xs texto-fraco mt-1">
            Alterar isto muda em qual tela de denúncia este motivo aparece daqui pra frente -
            denúncias antigas que já usaram este motivo não são afetadas retroativamente.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="rotulo-campo">Descrição</label>
          <input
            type="text"
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            required
            maxLength={LIMITE_DESCRICAO_MOTIVO_DENUNCIA}
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

interface ModalExcluirMotivoDenunciaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  motivo: MotivoDenunciaResponse;
  aoFechar: () => void;
  aoExcluido: () => void;
}

export function ModalExcluirMotivoDenuncia({ auth, motivo, aoFechar, aoExcluido }: ModalExcluirMotivoDenunciaProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await motivoDenunciaApi.remover(auth.authFetch, motivo.idMotivo);
      mostrar('Motivo de denúncia excluído com sucesso.', `ID: ${motivo.idMotivo} foi excluído`);
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
      titulo={`Excluir "${motivo.descricao}"`}
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
        <CampoFicha rotulo="Descrição" valor={motivo.descricao} largura="cheia" />
        <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO[motivo.tipo]} />
      </SecaoFicha>

      <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
        <p className="font-bold mb-1">
          <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
        </p>
        <p>
          Se este motivo já tiver sido usado em alguma denúncia, a exclusão é bloqueada pelo
          próprio banco - desative-o em vez de excluir. Se não estiver em uso, some do catálogo
          pra sempre, sem exclusão lógica.
        </p>
      </div>
    </ModalFicha>
  );
}
