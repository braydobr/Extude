document.addEventListener('DOMContentLoaded', () => {

    const formLogin = document.getElementById('form-login');

    if (formLogin) {
        formLogin.addEventListener('submit', async function (e) {
            e.preventDefault();

            const cpfValue = document.getElementById('cpf').value;
            const senhaValue = document.getElementById('senha').value;
            const cpfLimpo = cpfValue.replace(/\D/g, ''); // Remove pontos e traço

            // A função validarCPF está acessível pois o valida-cpf.js é carregado antes
            if (!validarCPF(cpfLimpo)) {
                mostrarAlerta("Insira um CPF válido", "error");
                document.getElementById('cpf').focus();
                return;
            }

            // O FastAPI (OAuth2) espera FormData, não JSON
            const formData = new URLSearchParams();
            formData.append('username', cpfLimpo); // Enviamos o CPF limpo como username
            formData.append('password', senhaValue);

            try {
                const resposta = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });

                const dados = await resposta.json();

                if (!resposta.ok) {
                    throw new Error(dados.detail || "Erro ao fazer login");
                }

                // Guardando o Token e dados do usuário
                localStorage.setItem('token', dados.access_token);
                localStorage.setItem('usuarioLogado', 'true');
                localStorage.setItem('nomeUsuario', dados.usuario.nome);
                localStorage.setItem('emailUsuario', dados.usuario.email);
                localStorage.setItem('nivelAcesso', dados.usuario.nivel);

                mostrarAlerta("Olá, " + dados.usuario.nome + "!", "success");

                // Redirecionamento baseado no nível de acesso
                setTimeout(() => {
                    if (dados.usuario.nivel === 0) {
                        // Direciona para o painel do administrador
                        window.location.href = "painel-admin.html";
                    } else {
                        // Correção: o nome correto do arquivo é painel-usuario.html
                        window.location.href = "painel-usuario.html";
                    }
                }, 2000);

            } catch (erro) {
                console.error("Erro no login:", erro);
                mostrarAlerta(erro.message, "error");
            }
        });
    }
});