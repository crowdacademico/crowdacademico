import { useCallback, useEffect, useState } from 'react';
import { BadgeStatusRepasse } from '../../components/crud/badge-status-repasse';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { GenericTable } from '../../components/crud/generic-table';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Tooltip } from '../../components/layout/tooltip';
import { contaRecebimentoApi } from '../../services/30-conta-recebimento/api/conta-recebimento.api';
import { ORDEM_TIPO_CHAVE_PIX, ROTULO_TIPO_CHAVE_PIX } from '../../services/30-conta-recebimento/constants/conta-recebimento.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { ContaRecebimentoResponse, RepasseResponse } from '../../services/30-conta-recebimento/type/conta-recebimento.type';
import type { TipoChavePix } from '../../services/constant/type/enums-do-banco.gerado';

// Recebimento do pesquisador, em Minha Conta > Acadêmico: a chave Pix para onde vai o repasse das campanhas dele e a
// lista desses repasses. O sistema confere no diretório Pix se o dono da chave tem o CPF do perfil; sem chave confirmada,
// o repasse espera. A chave inteira nunca volta do servidor (só mascarada).
export function SecaoRecebimento({ authFetch }: { authFetch: AuthFetch }) {
  // undefined = carregando; null = ainda sem chave.
  const [conta, setConta] = useState<ContaRecebimentoResponse | null | undefined>(undefined);
  const [editando, setEditando] = useState(false);
  const [tipoChave, setTipoChave] = useState<TipoChavePix>('cpf');
  const [chave, setChave] = useState('');
  const [removendo, setRemovendo] = useState(false);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);

  useEffect(() => {
    contaRecebimentoApi.buscar(authFetch).then(setConta).catch(reportarErro);
  }, [authFetch, reportarErro, chaveRecarga]);

  const listarRepasses = useCallback((): Promise<RepasseResponse[]> => contaRecebimentoApi.listarRepasses(authFetch), [authFetch]);

  if (conta === undefined) {
    return null;
  }

  const cadastrar = () =>
    executar(async () => {
      const salva = await contaRecebimentoApi.cadastrar(authFetch, tipoChave, chave.trim());
      mostrar(
        'Chave Pix salva.',
        salva?.titularidadeVerificada ? 'Titularidade confirmada: os repasses vão para ela.' : 'A titularidade não foi confirmada: o repasse fica esperando.',
        salva?.titularidadeVerificada ? 'sucesso' : 'aviso',
      );
      setEditando(false);
      setChave('');
      setChaveRecarga((atual) => atual + 1);
    });

  const remover = async () => {
    await executar(async () => {
      await contaRecebimentoApi.remover(authFetch);
      mostrar('Chave Pix removida.', 'Os próximos repasses esperam até você cadastrar outra.');
      setChaveRecarga((atual) => atual + 1);
    });
    setRemovendo(false);
  };

  const mostrarFormulario = conta === null || editando;

  return (
    <>
      <SecaoFicha titulo="Recebimento por Pix" nivel={2}>
        {erro && <p className="erro-campo">{erro}</p>}
        {conta && !editando && (
          <>
            <CampoFicha rotulo="Chave Pix" valor={`${ROTULO_TIPO_CHAVE_PIX[conta.tipoChave]}: ${conta.chaveMascarada}`} />
            <CampoFicha
              rotulo="Titularidade"
              valor={
                <span className={'badge ' + (conta.titularidadeVerificada ? 'badge-sucesso' : 'badge-aviso')}>
                  {conta.titularidadeVerificada ? 'Confirmada' : 'Não confirmada'}
                </span>
              }
            />
          </>
        )}
        {mostrarFormulario && (
          <>
            <Campo rotulo="Tipo de chave">
              {({ atributos, classeErro }) => (
                <select {...atributos} value={tipoChave} onChange={(evento) => setTipoChave(evento.target.value as TipoChavePix)} className={'input-padrao' + classeErro}>
                  {ORDEM_TIPO_CHAVE_PIX.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {ROTULO_TIPO_CHAVE_PIX[tipo]}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo rotulo="Chave">
              {({ atributos, classeErro }) => (
                <input {...atributos} value={chave} onChange={(evento) => setChave(evento.target.value)} className={'input-padrao' + classeErro} />
              )}
            </Campo>
          </>
        )}
      </SecaoFicha>

      {conta && !conta.titularidadeVerificada && !editando && (
        <CaixaAviso titulo="Titularidade não confirmada" tom="aviso" icone="fa-triangle-exclamation">
          <p>O repasse só sai para uma chave Pix no seu CPF. Troque por uma chave sua.</p>
        </CaixaAviso>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {mostrarFormulario ? (
          <>
            <button type="button" className="btn btn-primary" disabled={ocupado || chave.trim() === ''} onClick={() => void cadastrar()}>
              <i className="fa-solid fa-key" aria-hidden="true"></i> {conta ? 'Salvar nova chave' : 'Cadastrar chave'}
            </button>
            {editando && (
              <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => setEditando(false)}>
                Cancelar
              </button>
            )}
          </>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => setEditando(true)}>
              <i className="fa-solid fa-pen" aria-hidden="true"></i> Trocar chave
            </button>
            <button type="button" className="btn btn-danger" disabled={ocupado} onClick={() => setRemovendo(true)}>
              <i className="fa-solid fa-trash" aria-hidden="true"></i> Remover
            </button>
          </>
        )}
        <Tooltip texto="O dinheiro das suas campanhas, menos a taxa da plataforma, vai para esta chave quando a campanha fecha. Ela precisa estar no seu CPF: o sistema confere no diretório Pix." />
      </div>

      <GenericTable<RepasseResponse>
        titulo="Meus repasses"
        nivelTitulo={2}
        ajuda="O que cada campanha sua arrecadou e o que foi (ou vai ser) transferido para a sua chave Pix."
        colunas={[
          { chave: 'tituloCampanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'valorBruto', rotulo: 'arrecadado', tipo: 'dinheiro' },
          { chave: 'valorLiquido', rotulo: 'você recebe', tipo: 'dinheiro' },
          {
            chave: 'status',
            rotulo: 'status',
            tipo: 'status',
            renderizar: (linha) => <BadgeStatusRepasse status={linha.status} aguardandoConta={linha.status === 'pendente' && !conta?.titularidadeVerificada} />,
          },
          { chave: 'repassadoEm', rotulo: 'transferido em', tipo: 'dataHora' },
        ]}
        chavePrimaria="idRepasse"
        listar={listarRepasses}
        chaveRecarga={chaveRecarga}
        vazio={{ icone: 'fa-paper-plane', titulo: 'Nenhum repasse ainda.', texto: 'Quando uma campanha sua fechar com dinheiro arrecadado, o repasse aparece aqui.' }}
      />

      {removendo && (
        <ModalConfirmacao
          titulo="Remover a chave Pix?"
          rotuloConfirmar="Remover"
          rotuloOcupado="Removendo..."
          perigo
          ocupado={ocupado}
          aoConfirmar={() => void remover()}
          aoCancelar={() => setRemovendo(false)}
        >
          <p>Os próximos repasses ficam esperando até você cadastrar outra chave. O que já foi transferido não muda.</p>
        </ModalConfirmacao>
      )}
    </>
  );
}
