let cpfConfirmado = "";

// ETAPA 1: Verifica se o CPF existe no banco de dados
async function buscarConta() {
    // Pega o valor do input com ID "cpf" e remove qualquer máscara (pontos ou traços)
    const cpfInputBruto = document.getElementById('cpf').value;
    const cpfInput = cpfInputBruto.replace(/\D/g, ''); // Deixa estritamente os números
    
    if (cpfInput.length !== 11) {
        if(typeof mostrarAlerta === "function") mostrarAlerta("Digite um CPF válido com 11 números.", "error");
        return;
    }

    const btnBuscar = document.getElementById('btn-buscar');
    const textoOriginal = btnBuscar.innerHTML;
    btnBuscar.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Buscando...';
    btnBuscar.disabled = true;

    try {
        const resposta = await fetch(`/usuarios/verificar-cpf/${cpfInput}`, {
            method: 'GET',
            headers: {
                'ngrok-skip-browser-warning': 'true' // Essencial para rodar liso no ngrok mobile
            }
        });

        if (resposta.ok) {
            const dados = await resposta.json();
            
            if (dados.existe) {
                // Salva o CPF limpo para a próxima etapa
                cpfConfirmado = cpfInput;

                // Aplica a transição fluida com desfoque nativo ao mudar de passo
                if (typeof mudarPassoComTransicao === "function") {
                    mudarPassoComTransicao(() => {
                        document.getElementById('email-mascarado').innerText = mascararEmail(dados.email);
                        
                        // Troca as telas no meio do efeito de desfoque
                        document.getElementById('step-1').classList.add('hidden');
                        document.getElementById('step-2').classList.remove('hidden');
                        document.getElementById('dynamic-subtitle').innerHTML = "Crie uma nova senha para<br>restaurar seu acesso";
                    });
                } else {
                    // Fallback caso a função global falhe ou não seja encontrada
                    document.getElementById('email-mascarado').innerText = mascararEmail(dados.email);
                    document.getElementById('step-1').classList.add('hidden');
                    document.getElementById('step-2').classList.remove('hidden');
                    document.getElementById('dynamic-subtitle').innerHTML = "Crie uma nova senha para<br>restaurar seu acesso";
                }

            } else {
                if(typeof mostrarAlerta === "function") mostrarAlerta("Nenhuma conta encontrada com este CPF.", "error");
            }
        } else {
            if(typeof mostrarAlerta === "function") mostrarAlerta("Erro ao consultar o servidor.", "error");
        }
    } catch (error) {
        console.error("Erro:", error);
        if(typeof mostrarAlerta === "function") mostrarAlerta("Falha de conexão.", "error");
    } finally {
        btnBuscar.innerHTML = textoOriginal;
        btnBuscar.disabled = false;
    }
}

// ETAPA 2: Envia a nova senha para o servidor
async function salvarNovaSenha() {
    const novaSenha = document.getElementById('new-senha').value;
    const confirmSenha = document.getElementById('confirm-senha').value;

    // REGRA DE SEGURANÇA: Mínimo 6 caracteres E deve conter pelo menos 1 número (/\d/)
    if (novaSenha.length < 6 || !/\d/.test(novaSenha)) {
        if(typeof mostrarAlerta === "function") {
            mostrarAlerta("A senha deve ter pelo menos 6 caracteres e conter um número.", "error");
        } else {
            alert("A senha deve ter pelo menos 6 caracteres e conter um número.");
        }
        return;
    }

    if (novaSenha !== confirmSenha) {
        if(typeof mostrarAlerta === "function") mostrarAlerta("As senhas não coincidem.", "error");
        return;
    }

    const btnSalvar = document.getElementById('btn-salvar');
    const textoOriginal = btnSalvar.innerHTML;
    btnSalvar.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...';
    btnSalvar.disabled = true;

    const payload = {
        cpf: cpfConfirmado,
        nova_senha: novaSenha
    };

    try {
        const resposta = await fetch('/usuarios/redefinir-senha-esquecida', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload)
        });

        if (resposta.ok) {
            if(typeof mostrarAlerta === "function") mostrarAlerta("Senha redefinida com sucesso!", "success");
            
            // Aguarda a notificação sumir e manda pro login de forma tradicional
            // Nota: O próprio redirecionamento tradicional acionará o desfoque inicial em login.html
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        } else {
            if(typeof mostrarAlerta === "function") mostrarAlerta("Erro ao redefinir a senha.", "error");
            btnSalvar.innerHTML = textoOriginal;
            btnSalvar.disabled = false;
        }
    } catch (error) {
        console.error("Erro:", error);
        if(typeof mostrarAlerta === "function") mostrarAlerta("Falha de conexão.", "error");
        btnSalvar.innerHTML = textoOriginal;
        btnSalvar.disabled = false;
    }
}

// Funções Auxiliares
function voltarEtapa() {
    if (typeof mudarPassoComTransicao === "function") {
        mudarPassoComTransicao(() => {
            executarLimpezaVoltar();
        });
    } else {
        executarLimpezaVoltar();
    }
}

// Encapsula a lógica de limpeza para ser usada com ou sem transição animada
function ejecutarLimpezaVoltar() {
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('step-1').classList.remove('hidden');
    document.getElementById('dynamic-subtitle').innerHTML = "Para recuperar o acesso,<br>identifique sua conta";
    
    // Limpa os campos
    document.getElementById('new-senha').value = "";
    document.getElementById('confirm-senha').value = "";
    cpfConfirmado = "";
}

function mascararEmail(email) {
    if (!email) return "E-mail não cadastrado";
    const partes = email.split('@');
    if (partes.length !== 2) return email;
    
    const nome = partes[0];
    const dominio = partes[1];
    
    // Mostra as duas primeiras letras e esconde o resto (ex: br***@gmail.com)
    const nomeMascarado = nome.substring(0, 2) + "***";
    return `${nomeMascarado}@${dominio}`;
}