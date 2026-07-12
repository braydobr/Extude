document.getElementById('form-excluir-conta').addEventListener('submit', function (e) {
    // Evita o recarregamento automático da página ao enviar o formulário
    e.preventDefault();

    const senha = document.getElementById('senha-confirmacao').value;

    // Dispara o nosso modal customizado
    mostrarModalConfirmacao(
        "Atenção!", 
        "Você tem CERTEZA ABSOLUTA que deseja excluir sua conta? Esta ação não pode ser desfeita.", 
        "Sim, Excluir", 
        "danger", 
        async () => {
            // Tudo que está aqui dentro só executa se o usuário CONFIRMAR no modal
            
            const token = localStorage.getItem('token');
            const btnSubmit = document.getElementById('btn-submit-excluir');
            const textoOriginal = btnSubmit.innerHTML;

            // Feedback visual no botão enquanto a API trabalha
            btnSubmit.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Excluindo...';
            btnSubmit.disabled = true;

            try {
                const resposta = await fetch('/usuarios/perfil/excluir-conta', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true' // Impede bloqueios mobile
                    },
                    body: JSON.stringify({ senha: senha })
                });

                if (resposta.status === 204 || resposta.ok) {
                    mostrarAlerta("Conta excluída com sucesso.", "success");
                    
                    // Limpa o cache local e joga o usuário para o login
                    localStorage.clear();
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 2000);
                } else {
                    const dados = await resposta.json();
                    throw new Error(dados.detail || "Erro ao excluir conta.");
                }

            } catch (erro) {
                console.error("Erro:", erro);
                mostrarAlerta(erro.message, "error");
                
                // Restaura o botão em caso de erro (ex: senha errada)
                btnSubmit.innerHTML = textoOriginal;
                btnSubmit.disabled = false;
            }
        }
    );
});