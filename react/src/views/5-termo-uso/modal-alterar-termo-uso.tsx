import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TermoUsoResponse, TipoTermo } from '../../services/5-termo-uso/type/termo-uso.type';

interface ModalAlterarTermoUsoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  tipo: TipoTermo;
  idTermoInicial: number;
  aoFechar: () => void;
  // Chamado depois de salvar/tornar vigente com sucesso, ANTES de fechar -
  // quem abriu o modal (card de Regras do Negócio, listagem) usa isso pra
  // recarregar os próprios dados.
  aoSalvar?: () => void;
}

// Modal de Alterar (mesmo padrão de ModalAlterarUsuario): substitui a página `/admin/termos-uso/:id/alterar`.
// Regra de negócio: só edita conteúdo enquanto ninguém aceitou a versão (ver TermoUsoServiceAlterar no Nest).
//
// LISTBOX de versões existentes: abrir "Alterar" a partir do card mostra só a versão vigente daquele tipo, mas
// ela pode já estar travada (alguém aceitou); o listbox deixa trocar, sem fechar o modal, para QUALQUER outra
// versão do MESMO tipo (histórico incluso): útil quando a vigente está travada mas uma versão antiga, por
// acaso, nunca foi aceita por ninguém e ainda pode ser corrigida.
//
// SEM campo "Versão" separado: 2 caixas de texto mostrando a mesma versão (o listbox e um input editável) não
// faria sentido. `versao`/`tipo` são imutáveis; só `conteudo` se edita aqui.
//
// "Tornar vigente": ação separada de "Salvar" (editar conteúdo), chama `TermoUsoServiceAtivar` no Nest (Criar
// não ativa sozinho). Só aparece quando a versão selecionada AINDA NÃO é a vigente.
export function ModalAlterarTermoUso({
  auth,
  tipo,
  idTermoInicial,
  aoFechar,
  aoSalvar,
}: ModalAlterarTermoUsoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [versoesDoTipo, setVersoesDoTipo] = useState<TermoUsoResponse[] | null>(null);
  const [idSelecionado, setIdSelecionado] = useState(idTermoInicial);
  const [termo, setTermo] = useState<TermoUsoResponse | null>(null);
  const [conteudo, setConteudo] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [ativando, setAtivando] = useState(false);
  const idSelecionarVersao = useId();
  const idConteudo = useId();

  useEffect(() => {
    termoUsoApi
      .listar(auth.authFetch)
      .then((lista) => setVersoesDoTipo(lista.filter((linha) => linha.tipo === tipo)))
      .catch(() => setVersoesDoTipo([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    termoUsoApi
      .buscar(auth.authFetch, idSelecionado)
      .then((dados) => {
        setTermo(dados);
        setConteudo(dados.conteudo);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSelecionado]);

  // `setCarregando(true)`/`limparErro()` moram AQUI, não dentro do efeito
  // acima (react-hooks/set-state-in-effect não deixa chamar setState
  // sincronamente no corpo de um efeito) - disparados pelo `<select>` no
  // momento da troca, o efeito só reage à MUDANÇA de `idSelecionado` e cuida
  // só do fetch em si.
  const aoTrocarVersaoSelecionada = (novoId: number) => {
    setCarregando(true);
    limparErro();
    setIdSelecionado(novoId);
  };

  const sujo = termo !== null && conteudo !== termo.conteudo;
  useAvisoAlteracaoNaoSalva(sujo);

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoFechar();
  };

  const aoSalvarForm = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      await termoUsoApi.atualizar(auth.authFetch, idSelecionado, { conteudo });
      mostrar('Termos de Uso alterado com sucesso.', `Versão "${termo?.versao}" foi atualizada.`);
      aoSalvar?.();
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  const aoTornarVigente = async () => {
    limparErro();
    setAtivando(true);
    try {
      const termoAtivado = await termoUsoApi.ativar(auth.authFetch, idSelecionado);
      mostrar(
        'Versão tornada vigente com sucesso.',
        `Versão "${termoAtivado.versao}" agora é a vigente deste tipo.`,
      );
      aoSalvar?.();
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setAtivando(false);
    }
  };

  return (
    <ModalFicha
      titulo={`Alterar Termos de Uso - ${ROTULO_TIPO_TERMO[tipo]}`}
      subtitulo="Editar o texto só é possível enquanto ninguém tiver aceitado a versão selecionada. Depois do primeiro aceite, ela trava e a correção precisa virar uma versão nova."
      aoFechar={fechar}
      rodape={
        <div className="flex gap-3">
          <button type="button" onClick={fechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          {termo && !termo.ativo && (
            <button
              type="button"
              onClick={() => void aoTornarVigente()}
              disabled={ativando || enviando}
              className="btn btn-secondary flex-1"
            >
              {ativando ? 'Ativando...' : 'Tornar vigente'}
            </button>
          )}
          <button
            type="submit"
            form="form-modal-alterar-termo-uso"
            disabled={enviando || ativando || carregando || !termo || !sujo || !conteudo.trim()}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      }
    >
      <SecaoFicha titulo="Dados">
        <CampoSomenteLeitura rotulo="Tipo" valor={ROTULO_TIPO_TERMO[tipo]} />
      </SecaoFicha>

      <div>
        <label htmlFor={idSelecionarVersao} className="rotulo-campo">Selecionar versão para alterar</label>
        <select
          id={idSelecionarVersao}
          value={idSelecionado}
          onChange={(evento) => aoTrocarVersaoSelecionada(Number(evento.target.value))}
          className="input-padrao"
        >
          {(versoesDoTipo ?? []).map((linha) => (
            <option key={linha.idTermo} value={linha.idTermo}>
              {linha.versao}
              {linha.ativo ? ' (vigente)' : ''}
            </option>
          ))}
        </select>
      </div>

      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      {carregando ? (
        <p className="text-center text-sm texto-fraco py-4">Carregando...</p>
      ) : (
        termo && (
          <form
            id="form-modal-alterar-termo-uso"
            onSubmit={(evento) => void aoSalvarForm(evento)}
            className="space-y-6"
          >
            <div>
              <label htmlFor={idConteudo} className="rotulo-campo">Texto completo</label>
              <textarea
                id={idConteudo}
                value={conteudo}
                onChange={(evento) => setConteudo(evento.target.value)}
                required
                rows={14}
                className="input-padrao font-mono text-xs"
              />
            </div>
          </form>
        )
      )}
    </ModalFicha>
  );
}
