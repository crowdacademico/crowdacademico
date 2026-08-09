import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

// Terceira view do padrão "uma página por operação de CRUD" — mostra os
// dados de verdade antes de excluir (em vez do window.confirm() genérico
// que só mostrava o nome), com botão de confirmar/cancelar no fim.
export function ExcluirUsuario({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);
  // Confirmação por digitação (09-08-2026, Bloco I do prompt do Claude Web:
  // exclusão de USUÁRIO exige digitar o e-mail — configuração, mais abaixo
  // em excluir-configuracao.jsx, fica só com confirmação simples, é um
  // dado técnico, não a conta de uma pessoa).
  const [confirmacao, setConfirmacao] = useState('');
  const confirmado = usuario !== null && confirmacao.trim().toLowerCase() === usuario.email.toLowerCase();

  useEffect(() => {
    usuarioApi
      .buscar(auth.authFetch, id)
      .then(setUsuario)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aoConfirmar = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await usuarioApi.remover(auth.authFetch, id);
      mostrar('Usuário excluído com sucesso.', `ID: ${id} foi excluído`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      setExcluindo(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-triangle-exclamation"
      titulo="Excluir Usuário"
      subtitulo="Não existe botão de desfazer no painel."
      variante="perigo"
      rodape={
        usuario && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1"
            >
              Cancelar
            </button>
            {/* Vermelho só aqui, no final — nunca no topo da tela, depois
                da pessoa ter lido o que vai acontecer (09-08-2026, Bloco
                I). */}
            <button
              type="button"
              onClick={aoConfirmar}
              disabled={excluindo || !confirmado}
              className="btn btn-danger flex-1"
            >
              {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
            </button>
          </div>
        )
      }
    >
      {carregando ? (
        <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>
      ) : !usuario ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <div className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <CampoSomenteLeitura rotulo="id" valor={usuario.idUsuario} />
            <CampoSomenteLeitura rotulo="Nome" valor={usuario.nome} />
            <CampoSomenteLeitura rotulo="E-mail" valor={usuario.email} />
            <CampoSomenteLeitura
              rotulo="E-mail verificado"
              valor={usuario.emailVerificado ? 'Sim' : 'Não'}
            />
          </div>

          {/* Consequência real (09-08-2026, Bloco I: explicar o que
              acontece de verdade, não só "não pode ser desfeita") — é
              exclusão LÓGICA (usuario.deletado = TRUE via
              excluir_conta_usuario(), 03_funcoes_seguranca.sql [03-F]):
              nada é apagado do banco, só marcado e escondido. */}
          <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
            <p className="font-bold mb-1">
              <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
            </p>
            <p>
              A conta é marcada como excluída (exclusão lógica), não apagada do banco: o login
              deixa de funcionar e o perfil some do público na hora, mas o registro continua
              existindo pra auditoria e conformidade com a LGPD. Não existe um botão de
              "restaurar" no painel — reverter isso hoje exige acesso direto ao banco.
            </p>
          </div>

          <div>
            <label className="rotulo-campo">
              Digite o e-mail "{usuario.email}" pra confirmar
            </label>
            <input
              type="text"
              value={confirmacao}
              onChange={(evento) => setConfirmacao(evento.target.value)}
              className="input-padrao"
              placeholder={usuario.email}
              autoComplete="off"
            />
          </div>
        </div>
      )}
    </CartaoFormulario>
  );
}
