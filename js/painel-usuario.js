document.addEventListener('DOMContentLoaded', carregarEstatisticas);

async function carregarEstatisticas() {
    const token = localStorage.getItem('token');
    try {
        const resposta = await fetch('/usuarios/meu-desempenho', {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (resposta.ok) {
            const dados = await resposta.json();
            console.log("Estatísticas recebidas da API:", dados);
            atualizarTela(dados);
        } else {
            document.getElementById('texto-desempenho').innerText = "Erro ao carregar os dados. Tente novamente.";
            console.error("Erro na resposta da API. Status:", resposta.status);
        }
    } catch (error) {
        console.error("Erro na conexão:", error);
        document.getElementById('texto-desempenho').innerText = "Sem conexão com o servidor.";
        alert("Falha de conexão: " + error.message);
    }
}

function atualizarTela(dados) {
    // 1. Conversão e Tratamento de Dados (Garante que tudo seja número)
    const total = parseInt(dados.total_respondidas) || 0;
    const acertos = parseInt(dados.total_acertos) || 0;
    const erros = parseInt(dados.total_erros) || 0;
    const taxa = Number(dados.taxa_acerto) || 0;

    const engajamento = dados.engajamento || {
        portugues: 0, matematica: 0, historia: 0, geografia: 0, ingles: 0
    };

    // 2. Atualiza os Números Brutos nos Mini Cards
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-acertos').innerText = acertos;
    document.getElementById('stat-erros').innerText = erros;

    // 3. ATUALIZAÇÃO TEXTUAL IMEDIATA DO SVG E DISCIPLINAS
    const taxaArredondada = Math.round(taxa);
    document.getElementById('circle-percentage').textContent = `${taxaArredondada}%`;

    document.getElementById('txt-prog-portugues').textContent = `${engajamento.portugues}%`;
    document.getElementById('txt-prog-matematica').textContent = `${engajamento.matematica}%`;
    document.getElementById('txt-prog-historia').textContent = `${engajamento.historia}%`;
    document.getElementById('txt-prog-geografia').textContent = `${engajamento.geografia}%`;
    document.getElementById('txt-prog-ingles').textContent = `${engajamento.ingles}%`;

    // 4. Matemática das Barras Progressivas Lineares
    let percentAcertos = 0;
    let percentErros = 0;

    if (total > 0) {
        percentAcertos = (acertos / total) * 100;
        percentErros = (erros / total) * 100;
    }

    // 5. Animações Visuais (Executadas logo após a renderização do texto)
    setTimeout(() => {
        // Aplica o preenchimento dinâmico na linha do círculo SVG
        const circlePath = document.getElementById('circle-path');
        if (circlePath) {
            circlePath.style.strokeDasharray = `${taxaArredondada}, 100`;
        }

        // Aplica o tamanho dinâmico nas barras de acertos/erros
        const barCorrect = document.getElementById('bar-correct');
        const barWrong = document.getElementById('bar-wrong');

        if (barCorrect) barCorrect.style.width = `${percentAcertos}%`;
        if (barWrong) barWrong.style.width = `${percentErros}%`;

        // Animação das barras de disciplinas
        document.getElementById('bar-prog-portugues').style.width = `${engajamento.portugues}%`;
        document.getElementById('bar-prog-matematica').style.width = `${engajamento.matematica}%`;
        document.getElementById('bar-prog-historia').style.width = `${engajamento.historia}%`;
        document.getElementById('bar-prog-geografia').style.width = `${engajamento.geografia}%`;
        document.getElementById('bar-prog-ingles').style.width = `${engajamento.ingles}%`;
    }, 50);

    // 6. Texto Informativo de Feedback Dinâmico
    const textoDesempenho = document.getElementById('texto-desempenho');
    if (textoDesempenho) {
        if (total === 0) {
            textoDesempenho.innerHTML = "Ainda não há dados. <span>Inicie um treino</span> para gerar seu gráfico.";
        } else if (taxa >= 75) {
            textoDesempenho.innerHTML = "Desempenho alto. Sua taxa de acertos está <span>muito acima da média</span>.";
        } else if (taxa >= 50) {
            textoDesempenho.innerHTML = "Desempenho regular. Você está no caminho, mas há <span>margem para melhorar</span>.";
        } else {
            textoDesempenho.innerHTML = "Desempenho baixo. É recomendado <span>revisar a teoria base</span>.";
        }
    }
}