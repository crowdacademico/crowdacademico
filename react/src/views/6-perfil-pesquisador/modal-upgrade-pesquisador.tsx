import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { formatarCpf } from '../../services/constant/utils/formatacao.util';
import { CamposVinculoPerfil } from './campos-vinculo-perfil';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import type {
  TipoVinculo,
  TituloAcademico,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { TermoUsoResponseAtivo } from '../../services/5-termo-uso/type/termo-uso.type';

interface ModalUpgradePesquisadorProps {
  auth: Pick<UseAuthReturn, 'authFetch' | 'usuario'>;
  // Conta que vai virar pesquisadora - pode ser a própria conta logada OU
  // a de outra pessoa (14-09-2026, pedido do Lucas: o cadeado em T1 -
  // Bancada do Pesquisador precisa funcionar em qualquer linha, não só na
  // própria). O Termo de Uso aparece sempre, pra qualquer conta - o aceite
  // fica registrado em nome DESTE `idUsuarioAlvo`, nunca de quem está
  // preenchendo a tela.
  idUsuarioAlvo: number;
  // Botão "Gerar CPF válido" (mesmo padrão de ModalAlterarUsuario) -
  // ausente aqui por padrão, pedido de volta pelo Lucas (14-09-2026: "vai
  // ser útil por enquanto") - só quem chama de dentro do Campo de Testes
  // passa isso (bancada-pesquisador.tsx), nunca um consumidor de verdade.
  gerarCpfDeTeste?: () => string;
  aoFechar: () => void;
  aoConcluido: (perfil: PerfilPesquisadorResponse) => void;
}

type Etapa = 'termo' | 'formulario';

interface FormUpgrade {
  cpf: string;
  tipoVinculo: TipoVinculo;
  vinculoInstitucional: string;
  tituloAcademico: TituloAcademico;
}

const FORM_VAZIO: FormUpgrade = {
  cpf: '',
  tipoVinculo: 'institucional',
  vinculoInstitucional: '',
  tituloAcademico: 'mestre',
};

// Upgrade de perfil de pesquisador (13-09-2026, pedido do Lucas: cadeado em
// T1 - Bancada do Pesquisador, mas pensado pra qualquer tela futura que
// precise do mesmo botão). 2 etapas, SEMPRE do zero - de propósito SEM
// nenhum estado "já aceitei antes"/"upgrade em progresso" persistido em
// lugar nenhum (nem localStorage, nem backend): a etapa 1 (termo) é só
// estado local deste componente, NENHUMA requisição grava aceite até a
// etapa 2 ser enviada de verdade. Se a pessoa fechar o navegador no meio -
// depois de aceitar o termo, ou no meio do formulário - absolutamente nada
// foi gravado; na próxima vez que clicar no cadeado, começa do zero, no
// termo de novo. Isso evita de propósito qualquer estado travado tipo
// "upgrade em progresso" - não existe estado parcial pra destravar, porque
// não existe estado parcial gravado em lugar nenhum.
//
// SEMPRE a própria conta OU a de outra pessoa (14-09-2026, decisão do Lucas
// via AskUserQuestion): o Termo de Uso da etapa 1 aparece nos dois casos -
// quando `idUsuarioAlvo` é outra pessoa, quem está fisicamente clicando é o
// administrador, mas o aceite é gravado em nome do ALVO (mesma função
// SECURITY DEFINER `registrar_aceite_termo`, que aceita qualquer
// id_usuario, não só o da sessão atual). Por baixo, chama `criar` (self)
// quando o alvo é a própria conta logada, ou `criarParaOutro` (mesmo
// endpoint que o card "Criar Perfil Pesquisador" de ModalAlterarUsuario já
// usa) quando é outra - o Nest decide o que gravar a partir do `aceiteTermos`
// vindo `true` daqui.
export function ModalUpgradePesquisador({
  auth,
  idUsuarioAlvo,
  gerarCpfDeTeste,
  aoFechar,
  aoConcluido,
}: ModalUpgradePesquisadorProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [etapa, setEtapa] = useState<Etapa>('termo');
  const [termo, setTermo] = useState<TermoUsoResponseAtivo | null>(null);
  const [carregandoTermo, setCarregandoTermo] = useState(true);
  const [termoIndisponivel, setTermoIndisponivel] = useState(false);
  const [aceitou, setAceitou] = useState(false);
  const [form, setForm] = useState<FormUpgrade>(FORM_VAZIO);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    termoUsoApi
      .buscarAtivo('upgrade_pesquisador')
      .then(setTermo)
      // 404 = admin ainda não publicou/tornou vigente nenhuma versão deste
      // tipo - estado real, tratado sem quebrar (bloqueia "Aceitar", não
      // deixa a pessoa avançar sem termo nenhum pra aceitar).
      .catch(() => setTermoIndisponivel(true))
      .finally(() => setCarregandoTermo(false));
  }, []);

  const ehContaPropria = idUsuarioAlvo === auth.usuario?.idUsuario;

  const aoEnviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const dadosPerfil = {
        cpf: form.cpf,
        tipoVinculo: form.tipoVinculo,
        vinculoInstitucional:
          form.tipoVinculo === 'institucional' ? form.vinculoInstitucional : undefined,
        tituloAcademico: form.tituloAcademico,
      };
      const perfilCriado = ehContaPropria
        ? await perfilPesquisadorApi.criar(auth.authFetch, {
            ...dadosPerfil,
            aceiteTermos: true,
          })
        : await perfilPesquisadorApi.criarParaOutro(auth.authFetch, idUsuarioAlvo, {
            ...dadosPerfil,
            aceiteTermos: true,
          });
      mostrar('Perfil de pesquisador criado com sucesso.', 'O upgrade de perfil foi concluído.');
      aoConcluido(perfilCriado);
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalFicha
      titulo={
        etapa === 'termo'
          ? 'Upgrade de Perfil - Termos de Uso'
          : 'Upgrade de Perfil - Dados de Pesquisador'
      }
      aoFechar={aoFechar}
      rodape={
        etapa === 'termo' ? (
          <div className="flex gap-3 max-w-sm ml-auto">
            <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setEtapa('formulario')}
              disabled={carregandoTermo || termoIndisponivel || !aceitou}
              className="btn btn-primary flex-1"
            >
              Aceitar
            </button>
          </div>
        ) : (
          <div className="flex gap-3 max-w-sm ml-auto">
            <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              form="form-upgrade-pesquisador"
              disabled={enviando || !form.cpf}
              className="btn btn-primary flex-1"
            >
              {enviando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      {etapa === 'termo' ? (
        carregandoTermo ? (
          <p className="text-sm texto-fraco text-center py-6">Carregando...</p>
        ) : termoIndisponivel || !termo ? (
          <p className="text-sm texto-erro text-center py-6">
            Termos de Uso deste tipo ainda não foram publicados. Peça a um administrador para
            publicar e tornar vigente em Regras do Negócio.
          </p>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm border borda-padrao rounded-lg p-4">
              {termo.conteudo}
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold texto-padrao mt-4">
              <input
                type="checkbox"
                checked={aceitou}
                onChange={(evento) => setAceitou(evento.target.checked)}
              />
              Li e aceito os Termos de Uso acima.
            </label>
          </>
        )
      ) : (
        <form id="form-upgrade-pesquisador" onSubmit={(evento) => void aoEnviar(evento)}>
          <SecaoFicha titulo="Criar Perfil Pesquisador">
            <div>
              <label className="rotulo-campo">CPF</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formatarCpf(form.cpf)}
                  onChange={(evento) =>
                    setForm({ ...form, cpf: evento.target.value.replace(/\D/g, '').slice(0, 11) })
                  }
                  className="input-padrao"
                />
                {gerarCpfDeTeste && (
                  <button
                    type="button"
                    className="btn btn-secondary text-xs whitespace-nowrap"
                    onClick={() => setForm({ ...form, cpf: gerarCpfDeTeste() })}
                  >
                    Gerar CPF válido
                  </button>
                )}
              </div>
            </div>

            <CamposVinculoPerfil
              tipoVinculo={form.tipoVinculo}
              vinculoInstitucional={form.vinculoInstitucional}
              tituloAcademico={form.tituloAcademico}
              rotuloVinculoInstitucional="Instituição"
              aoAlterarTipoVinculo={(tipo) => setForm({ ...form, tipoVinculo: tipo })}
              aoAlterarVinculoInstitucional={(valor) => setForm({ ...form, vinculoInstitucional: valor })}
              aoAlterarTituloAcademico={(titulo) => setForm({ ...form, tituloAcademico: titulo })}
            />
          </SecaoFicha>
        </form>
      )}
    </ModalFicha>
  );
}
