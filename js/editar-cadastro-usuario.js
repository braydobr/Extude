document.addEventListener('DOMContentLoaded', carregarDadosPerfil);

// Busca as informações atuais do usuário no backend
async function carregarDadosPerfil() {
    const token = localStorage.getItem('token');

    try {
        const resposta = await fetch('/usuarios/perfil', {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (resposta.ok) {
            const dados = await resposta.json();

            // Preenche os inputs com os dados retornados
            document.getElementById('edit-nome').value = dados.nome;
            document.getElementById('edit-email').value = dados.email;

            // Extrai a primeira letra do nome para o Avatar (ex: "Brayan" -> "B")
            const inicial = dados.nome ? dados.nome.charAt(0).toUpperCase() : "U";
            document.getElementById('avatar-preview').innerText = inicial;

        } else {
            if (typeof mostrarAlerta === "function") {
                mostrarAlerta("Erro ao carregar dados.", "error");
            }
            console.error("Status de erro HTTP:", resposta.status);
        }
    } catch (error) {
        console.error("Erro na conexão:", error);
        if (typeof mostrarAlerta === "function") {
            mostrarAlerta("Falha de conexão com o servidor.", "error");
        }
    }
}

// Salva as alterações feitas no formulário
// Salva as alterações feitas no formulário
async function salvarPerfil(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    const btnSalvar = document.getElementById('btn-salvar');
    const conteudoOriginal = btnSalvar.innerHTML;

    // Feedback visual de carregamento no botão
    btnSalvar.innerHTML = '<i class="ph ph-spinner ph-spin" style="font-size: 1.3rem; margin-right: 8px;"></i> Salvando...';
    btnSalvar.disabled = true;

    const dadosAtualizados = {
        nome: document.getElementById('edit-nome').value,
        email: document.getElementById('edit-email').value
    };

    try {
        const resposta = await fetch('/usuarios/perfil/editar', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(dadosAtualizados)
        });

        if (resposta.ok) {
            // Exibe a mensagem de sucesso
            if (typeof mostrarAlerta === "function") {
                mostrarAlerta("Dados atualizados com sucesso!", "success");
            } else {
                alert("Dados atualizados com sucesso!");
            }

            // Aguarda 1.5s para o usuário ver o alerta e redireciona forçando o recarregamento
            setTimeout(() => {
                // O parâmetro de tempo na URL obriga o navegador mobile a ignorar o cache e baixar o perfil atualizado
                window.location.href = `perfil.html?t=${new Date().getTime()}`;
            }, 1500);

        } else {
            if (typeof mostrarAlerta === "function") {
                mostrarAlerta("Erro ao atualizar o perfil no banco de dados.", "error");
            }
            // Apenas restaura o botão se houver erro
            btnSalvar.innerHTML = conteudoOriginal;
            btnSalvar.disabled = false;
        }
    } catch (error) {
        console.error("Erro na conexão:", error);
        if (typeof mostrarAlerta === "function") {
            mostrarAlerta("Falha de conexão.", "error");
        }
        btnSalvar.innerHTML = conteudoOriginal;
        btnSalvar.disabled = false;
    }

}