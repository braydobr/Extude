document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. SISTEMA DE RASCUNHO (Restaurar e Salvar)
    // ==========================================
    const campos = ['nome', 'cpf', 'email', 'senha'];

    // Restaura os dados salvos quando a página carrega
    campos.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            const valorSalvo = sessionStorage.getItem('rascunho_' + id);
            if (valorSalvo) {
                input.value = valorSalvo;
            }
        }
    });

    // Salva os dados no rascunho a cada letra digitada
    campos.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                sessionStorage.setItem('rascunho_' + id, e.target.value);
            });
        }
    });

    // ==========================================
    // 2. LÓGICA DE CADASTRO (FastAPI)
    // ==========================================
    const formCadastro = document.getElementById('form-cadastro');

    if (formCadastro) {
        formCadastro.addEventListener('submit', async function (e) {
            e.preventDefault();

            // =================================================================
            // NOVA VALIDAÇÃO: Termos de Uso (Substituindo o nativo do navegador)
            // =================================================================
            const checkboxTermos = document.getElementById('termos');
            if (checkboxTermos && !checkboxTermos.checked) {
                mostrarAlerta("Você precisa ler e concordar com os Termos de Uso para continuar.", "error");
                return; // Interrompe o envio do formulário aqui
            }

            // Captura dos valores dos campos
            const nomeValue = document.getElementById('nome').value;
            const cpfValue = document.getElementById('cpf').value.replace(/\D/g, '');
            const emailValue = document.getElementById('email').value;
            const senhaValue = document.getElementById('senha').value;

            // Validação de CPF
            if (!validarCPF(cpfValue)) {
                mostrarAlerta("Insira um CPF válido", "error");
                document.getElementById('cpf').focus();
                return;
            }

            // Validação de Senha
            if (senhaValue.length < 6 || !/\d/.test(senhaValue)) {
                mostrarAlerta("A senha deve ter pelo menos 6 caracteres e conter um número.", "error");
                document.getElementById('senha').focus();
                return;
            }

            // Montagem do objeto JSON para o backend
            const novoUsuario = {
                nome: nomeValue,
                email: emailValue,
                cpf: cpfValue,
                senha: senhaValue,
                nivel_acesso: 1, 
                meta: 0
            };

            try {
                const resposta = await fetch('/usuarios/cadastrar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify(novoUsuario)
                });

                const dados = await resposta.json();

                if (resposta.ok) {
                    mostrarAlerta("Sua conta foi criada!", "success");

                    // Limpa o rascunho do sessionStorage
                    campos.forEach(id => sessionStorage.removeItem('rascunho_' + id));

                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 2000);
                }
                else if (resposta.status === 422) {
                    throw new Error("Insira um e-mail válido.");
                }
                else {
                    const mensagemErro = typeof dados.detail === 'string'
                        ? dados.detail
                        : "Erro ao cadastrar. Verifique seus dados";

                    throw new Error(mensagemErro);
                }

            } catch (erro) {
                console.error("Erro:", erro);
                mostrarAlerta(erro.message, "error");
            }
        });
    }
});