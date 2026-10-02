import { useState } from 'react';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { ResumoAlteracoes } from '../../components/crud/resumo-alteracoes';
import { CaixaTextoLongo } from '../../components/crud/caixa-texto-longo';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Campo } from '../../components/input/campo';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { formatarData } from '../../services/constant/util/formatacao.util';
import { Carregando } from '../../components/layout/carregando';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TipoTermo } from '../../services/5-termo-uso/type/termo-uso.type';
import { etiquetasTermoUso } from './etiquetas-termo-uso';

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
// Regra de negócio: só edita conteúdo enquanto ninguém aceitou a versão (ver TermoUsoServiceUpdate no Nest).
//
// LISTBOX de versões existentes: abrir "Alterar" a partir do card mostra só a versão vigente daquele tipo, mas
// ela pode já estar travada (alguém aceitou); o listbox deixa trocar, sem fechar o modal, para QUALQUER outra
// versão do MESMO tipo (histórico incluso): útil quando a vigente está travada mas uma versão antiga, por
// acaso, nunca foi aceita por ninguém e ainda pode ser corrigida.
//
// SEM campo "Versão" separado: 2 caixas de texto mostrando a mesma versão (o listbox e um input editável) não
// faria sentido. `versao`/`tipo` são imutáveis; só `conteudo` se edita aqui.
//
// "Tornar vigente": ação separada de "Salvar" (editar conteúdo), chama `TermoUsoServiceActivate` no Nest (Criar
// não ativa sozinho). Só aparece quando a versão selecionada AINDA NÃO é a vigente.
export function ModalAlterarTermoUso({
  auth,
  tipo,
  idTermoInicial,
  aoFechar,
  aoSalvar,
}: ModalAlterarTermoUsoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado: ativando, executar: executarAtivando } = useEnvio(reportarErro, limparErro);
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [idSelecionado, setIdSelecionado] = useState(idTermoInicial);
  const [conteudo, setConteudo] = useState('');
  const { dado: versoesDoTipo } = useBuscar(
    () => termoUsoApi.listar(auth.authFetch).then((lista) => lista.filter((linha) => linha.tipo === tipo)),
    [],
  );
  // Versão já aceita: o texto vem só para leitura (o banco recusaria salvar), e "Tornar vigente" continua valendo.
  const selecionada = versoesDoTipo?.find((linha) => linha.idTermo === idSelecionado);
  const aceitesSelecionada = selecionada?.aceites ?? 0;
  const somenteLeitura = aceitesSelecionada > 0;
  const { dado: termo, carregando } = useBuscar(() => termoUsoApi.buscar(auth.authFetch, idSelecionado), [idSelecionado], {
    aoChegar: (dados) => setConteudo(dados.conteudo),
    erros: { erro, reportarErro, limparErro },
  });

  const aoTrocarVersaoSelecionada = (novoId: number) => setIdSelecionado(novoId);

  const sujo = termo !== null && conteudo !== termo.conteudo;
  useAvisoAlteracaoNaoSalva(sujo);

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoFechar();
  };

  const aoSalvarTexto = async () => {
    await executarEnviando(async () => {
      await termoUsoApi.atualizar(auth.authFetch, idSelecionado, { conteudo });
      mostrar('Termo de Uso alterado com sucesso.', `Versão "${termo?.versao}" foi atualizada.`);
      aoSalvar?.();
      aoFechar();
    });
  };

  const aoTornarVigente = async () => {
    await executarAtivando(async () => {
      const termoAtivado = await termoUsoApi.ativar(auth.authFetch, idSelecionado);
      mostrar(
        'Versão tornada vigente com sucesso.',
        `Versão "${termoAtivado.versao}" agora é a vigente deste tipo.`,
      );
      aoSalvar?.();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Alterar Termo de Uso - ${ROTULO_TIPO_TERMO[tipo]}`}
      ajuda="Editar o texto só é possível enquanto ninguém tiver aceitado a versão selecionada. Depois do primeiro aceite, ela trava e a correção precisa virar uma versão nova."
      carregando={!versoesDoTipo}
      variasTelas
      badges={selecionada && etiquetasTermoUso(selecionada)}
      aoFechar={fechar}
      rodape={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResumoAlteracoes mudancas={sujo ? ['texto'] : []} />
          <div className="flex flex-1 justify-end gap-3">
            <button type="button" onClick={fechar} className="btn btn-secondary">
              Cancelar
            </button>
            {termo && !termo.ativo && (
              <button
                type="button"
                onClick={() => void aoTornarVigente()}
                disabled={ativando || enviando}
                className="btn btn-secondary"
              >
                {ativando ? 'Ativando...' : 'Tornar vigente'}
              </button>
            )}
            {!somenteLeitura && (
              <button
                type="button"
                onClick={() => void aoSalvarTexto()}
                disabled={enviando || ativando || carregando || !termo || !sujo || !conteudo.trim()}
                className="btn btn-primary"
              >
                {enviando ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* Seletor à esquerda e, na mesma linha e centrada nele, a data de criação da versão. */}
      <Campo rotulo="Selecionar versão para alterar">
        {({ atributos }) => (
          <div className="flex items-center gap-6">
            <select
              {...atributos}
              value={idSelecionado}
              onChange={(evento) => aoTrocarVersaoSelecionada(Number(evento.target.value))}
              className="input-padrao flex-1 min-w-0"
            >
              {(versoesDoTipo ?? []).map((linha) => (
                <option key={linha.idTermo} value={linha.idTermo}>
                  {linha.versao}
                </option>
              ))}
            </select>
            {termo && <p className="legenda texto-fraco shrink-0">Criada em {formatarData(termo.criadoEm)}</p>}
          </div>
        )}
      </Campo>

      <MensagemErro texto={erro} />

      {carregando ? (
        <Carregando className="text-center py-4" />
      ) : (
        termo && (
          <div className="flex-1 flex flex-col space-y-6">
            {somenteLeitura && (
              <p className="legenda-destaque fundo-aviso texto-aviso rounded-lg p-3">
                Esta versão já tem {aceitesSelecionada} aceite(s) registrado(s): o texto é a prova do que foi aceito e não
                pode mais mudar. Para corrigir, publique uma versão nova. Tornar esta versão vigente continua possível.
              </p>
            )}
            <CaixaTextoLongo
              rotulo="Texto completo"
              tituloTelaCheia={`Versão ${termo.versao}`}
              valor={conteudo}
              aoMudar={somenteLeitura ? undefined : setConteudo}
            />
          </div>
        )
      )}
    </ModalFicha>
  );
}
