async function salvarNovaSenha(event) {
    event.preventDefault();
    
    const novaSenha = document.getElementById('input-nova-senha').value;
    const confirmarSenha = document.getElementById('input-confirmar-senha').value;

    // 1. Validação local (Frontend)
    if (novaSenha !== confirmarSenha) {
        if(typeof mostrarAlerta === "function") {
            mostrarAlerta("As senhas não coincidem. Tente novamente.", "error");
        } else {
            alert("As senhas não coincidem. Tente novamente.");
        }
        return;
    }

    const token = localStorage.getItem('token');
    const btnSalvar = document.getElementById('btn-salvar-senha');
    const conteudoOriginal = btnSalvar.innerHTML;
    
    // 2. Feedback visual
    btnSalvar.innerHTML = '<i class="ph ph-spinner ph-spin" style="font-size: 1.3rem; margin-right: 8px;"></i> Atualizando...';
    btnSalvar.disabled = true;

    // 3. Payload de acordo com o Schema "RedefinirSenhaLogado" do backend
    const payload = {
        nova_senha: novaSenha
    };

    try {
        const resposta = await fetch('/usuarios/perfil/redefinir-senha-token', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload)
        });

        if (resposta.ok) {
            if(typeof mostrarAlerta === "function") {
                mostrarAlerta("Senha atualizada com sucesso!", "success");
            } else {
                alert("Senha atualizada com sucesso!");
            }

            // Aguarda 1.5s e redireciona para o perfil quebrando o cache
            setTimeout(() => {
                window.location.href = `perfil.html?t=${new Date().getTime()}`;
            }, 1500);

        } else {
            const erroData = await resposta.json();
            if(typeof mostrarAlerta === "function") {
                mostrarAlerta(erroData.detail || "Erro ao atualizar a senha.", "error");
            }
            btnSalvar.innerHTML = conteudoOriginal;
            btnSalvar.disabled = false;
        }
    } catch (error) {
        console.error("Erro na conexão:", error);
        if(typeof mostrarAlerta === "function") {
            mostrarAlerta("Falha de conexão com o servidor.", "error");
        }
        btnSalvar.innerHTML = conteudoOriginal;
        btnSalvar.disabled = false;
    }
}