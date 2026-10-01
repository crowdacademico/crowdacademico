import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { CampoCpf } from '../../components/input/campo-cpf';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { CamposVinculoPerfil } from './campos-vinculo-perfil';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { Carregando } from '../../components/layout/carregando';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import type {
  TipoVinculo,
  TituloAcademico,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { TermoUsoResponseActive } from '../../services/5-termo-uso/type/termo-uso.type';

interface ModalUpgradePesquisadorProps {
  auth: Pick<UseAuthReturn, 'authFetch' | 'usuario'>;
  // Conta que vai virar pesquisadora: pode ser a própria conta logada OU a de outra pessoa (o cadeado em T1,
  // Bancada do Pesquisador, precisa funcionar em qualquer linha, não só na própria). O Termo de Uso aparece
  // sempre, para qualquer conta: o aceite fica registrado em nome DESTE `idUsuarioAlvo`, nunca de quem está
  // preenchendo a tela.
  idUsuarioAlvo: number;
  // Botão "Gerar CPF válido" (mesmo padrão de ModalAlterarUsuario): ausente por padrão; só quem chama de dentro
  // do Campo de Testes passa isso (bancada-pesquisador.tsx), nunca um consumidor de verdade.
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

// Upgrade de perfil de pesquisador (cadeado em T1, Bancada do Pesquisador, mas pensado para qualquer tela
// futura que precise do mesmo botão). 2 etapas, SEMPRE do zero: de propósito SEM nenhum estado "já aceitei
// antes"/"upgrade em progresso" persistido em lugar nenhum (nem localStorage, nem backend): a etapa 1 (termo) é
// só estado local deste componente, NENHUMA requisição grava aceite até a etapa 2 ser enviada de verdade. Se a
// pessoa fechar o navegador no meio (depois de aceitar o termo, ou no meio do formulário), absolutamente nada
// foi gravado; na próxima vez que clicar no cadeado, começa do zero, no termo de novo. Não existe estado
// parcial para destravar, porque não existe estado parcial gravado em lugar nenhum.
//
// SEMPRE a própria conta OU a de outra pessoa: o Termo de Uso da etapa 1 aparece nos dois casos; quando
// `idUsuarioAlvo` é outra pessoa, quem está fisicamente clicando é o administrador, mas o aceite é gravado em
// nome do ALVO (mesma função SECURITY DEFINER `registrar_aceite_termo`, que aceita qualquer id_usuario, não só
// o da sessão atual). Por baixo, chama `criar` (self) quando o alvo é a própria conta logada, ou
// `criarParaOutro` (mesmo endpoint que o card "Criar Perfil Pesquisador" de ModalAlterarUsuario usa) quando é
// outra: o Nest decide o que gravar a partir do `aceiteTermos` vindo `true` daqui.
export function ModalUpgradePesquisador({
  auth,
  idUsuarioAlvo,
  gerarCpfDeTeste,
  aoFechar,
  aoConcluido,
}: ModalUpgradePesquisadorProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [etapa, setEtapa] = useState<Etapa>('termo');
  const [termo, setTermo] = useState<TermoUsoResponseActive | null>(null);
  const [carregandoTermo, setCarregandoTermo] = useState(true);
  const [termoIndisponivel, setTermoIndisponivel] = useState(false);
  const [aceitou, setAceitou] = useState(false);
  const [form, setForm] = useState<FormUpgrade>(FORM_VAZIO);
  // Botões sempre clicáveis: clicando com algo faltando, o erro aparece no lugar certo (a caixa do aceite, o CPF, a
  // instituição). Só "Aceitar" sem Termo publicado continua travado, com a explicação no corpo.
  const aceite = useErrosFormulario(() => ({ aceite: !aceitou && 'Marque a caixa para aceitar o Termo e continuar.' }));
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    cpf: form.cpf.trim() === '' && 'Informe o CPF.',
    vinculoInstitucional:
      form.tipoVinculo === 'institucional' && form.vinculoInstitucional.trim() === '' && 'Informe a instituição.',
  }));

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
    if (!tentarEnviar()) return;
    await executarEnviando(async () => {
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
    });
  };

  return (
    <ModalFicha
      variasTelas
      titulo={
        etapa === 'termo'
          ? 'Upgrade de Perfil - Termo de Uso'
          : 'Upgrade de Perfil - Dados de Pesquisador'
      }
      aoFechar={aoFechar}
      rodape={
        etapa === 'termo' ? (
          <RodapeAcoes
            aoCancelar={aoFechar}
            acao={{
              rotulo: 'Aceitar',
              desabilitado: carregandoTermo || termoIndisponivel,
              aoClicar: () => {
                if (aceite.tentarEnviar()) setEtapa('formulario');
              },
            }}
          />
        ) : (
          <RodapeAcoes
            aoCancelar={aoFechar}
            acao={{
              rotulo: 'Salvar',
              rotuloOcupado: 'Salvando...',
              ocupado: enviando,
              formulario: 'form-upgrade-pesquisador',
            }}
          />
        )
      }
      erro={erro}
    >
      {etapa === 'termo' ? (
        carregandoTermo ? (
          <Carregando className="text-center py-6" />
        ) : termoIndisponivel || !termo ? (
          <p className="text-sm texto-erro text-center py-6">
            O Termo de Uso deste tipo ainda não foi publicado. Peça a um administrador para
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
                aria-invalid={Boolean(aceite.erroDe('aceite'))}
              />
              Li e aceito o Termo de Uso acima.
            </label>
            {aceite.erroDe('aceite') && (
              <p className="text-xs texto-erro font-semibold mt-1">{aceite.erroDe('aceite')}</p>
            )}
          </>
        )
      ) : (
        <form id="form-upgrade-pesquisador" onSubmit={(evento) => void aoEnviar(evento)} noValidate>
          <SecaoFicha titulo="Criar Perfil Pesquisador">
            <CampoCpf
              valor={form.cpf}
              erro={erroDe('cpf') ?? errosCampo.cpf}
              onChange={(cpf) => {
                setForm({ ...form, cpf });
                limparErroCampo('cpf');
              }}
              gerarCpfDeTeste={gerarCpfDeTeste}
            />

            <CamposVinculoPerfil
              tipoVinculo={form.tipoVinculo}
              vinculoInstitucional={form.vinculoInstitucional}
              tituloAcademico={form.tituloAcademico}
              rotuloVinculoInstitucional="Instituição"
              aoAlterarTipoVinculo={(tipo) => setForm({ ...form, tipoVinculo: tipo })}
              aoAlterarVinculoInstitucional={(valor) => setForm({ ...form, vinculoInstitucional: valor })}
              aoAlterarTituloAcademico={(titulo) => setForm({ ...form, tituloAcademico: titulo })}
              erroVinculoInstitucional={erroDe('vinculoInstitucional') ?? errosCampo.vinculoInstitucional}
            />
          </SecaoFicha>
        </form>
      )}
    </ModalFicha>
  );
}
