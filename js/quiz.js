const urlParams = new URLSearchParams(window.location.search);
const disciplinaFiltro = urlParams.get('disciplina');
const modoAleatorio = urlParams.get('modo') === 'aleatorio';

let filaQuestoes = [];
let indiceAtual = 0;
let alternativaSelecionada = null;
let questaoJaRespondida = false;

document.addEventListener('DOMContentLoaded', carregarFilaDeQuestoes);

async function carregarFilaDeQuestoes() {
    const token = localStorage.getItem('token');
    try {
        const resposta = await fetch('/questoes/listar', {
            method: 'GET',
            cache: 'no-store',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true' 
            }
        });

        if (resposta.ok) {
            let todasAsQuestoes = await resposta.json();
            
            if (disciplinaFiltro) {
                todasAsQuestoes = todasAsQuestoes.filter(q => q.disciplina === disciplinaFiltro);
            }

            if (todasAsQuestoes.length === 0) {
                alert("Nenhuma questão encontrada para este tema no momento.");
                window.location.href = "questoes.html";
                return;
            }

            filaQuestoes = todasAsQuestoes.sort(() => Math.random() - 0.5);
            desenharQuestaoAtual();
        } else {
            alert("Erro ao buscar as questões.");
            window.location.href = "questoes.html";
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Falha de conexão com o servidor.");
    }
}

function desenharQuestaoAtual() {
    if (indiceAtual >= filaQuestoes.length) {
        if(typeof mostrarAlerta === "function") mostrarAlerta("Você concluiu todas as questões!", "success");
        else alert("Você concluiu todas as questões!");
        setTimeout(() => window.location.href = "questoes.html", 1500);
        return;
    }

    const questao = filaQuestoes[indiceAtual];
    
    alternativaSelecionada = null;
    questaoJaRespondida = false;
    document.getElementById('explanation-section').style.display = 'none';
    
    const btnAcao = document.getElementById('btn-acao');
    btnAcao.innerHTML = 'Confirmar Resposta';
    btnAcao.disabled = false;

    // Preenche os textos divididos em elementos refinados
    document.getElementById('q-contador').innerText = `Questão ${indiceAtual + 1} / ${filaQuestoes.length}`;
    document.getElementById('q-disciplina').innerText = questao.disciplina;
    document.getElementById('q-assunto').innerText = questao.assunto;
    document.getElementById('q-enunciado').innerText = questao.enunciado;

    const container = document.getElementById('options-container');
    container.innerHTML = ''; 
    
    const alternativas = [
        { letra: 'A', texto: questao.alternativa_a },
        { letra: 'B', texto: questao.alternativa_b },
        { letra: 'C', texto: questao.alternativa_c },
        { letra: 'D', texto: questao.alternativa_d }
    ];

    alternativas.forEach(alt => {
        const div = document.createElement('div');
        div.className = 'option-card';
        div.id = `opt-${alt.letra}`;
        
        // Estrutura HTML interna da alternativa totalmente nova para comportar o Badge
        div.innerHTML = `
            <div class="option-letter">${alt.letra}</div>
            <div class="text-content">${alt.texto}</div>
        `;
        
        div.onclick = () => selecionarAlternativa(alt.letra);
        container.appendChild(div);
    });

    document.getElementById('loading-area').style.display = 'none';
    document.getElementById('quiz-area').style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selecionarAlternativa(letra) {
    if (questaoJaRespondida) return;
    document.querySelectorAll('.option-card').forEach(opt => opt.classList.remove('selected'));
    document.getElementById(`opt-${letra}`).classList.add('selected');
    alternativaSelecionada = letra;
}

async function tratarBotaoPrincipal() {
    if (questaoJaRespondida) {
        indiceAtual++;
        desenharQuestaoAtual();
        return;
    }

    if (!alternativaSelecionada) {
        if(typeof mostrarAlerta === "function") mostrarAlerta("Selecione uma alternativa!", "error");
        else alert("Selecione uma alternativa!");
        return;
    }

    await enviarRespostaParaBackend();
}

async function enviarRespostaParaBackend() {
    const token = localStorage.getItem('token');
    const questao = filaQuestoes[indiceAtual];
    const btnAcao = document.getElementById('btn-acao');
    
    btnAcao.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Validando...';
    btnAcao.disabled = true;

    const payload = {
        questao_id: questao.questao_id,
        alternativa_escolhida: alternativaSelecionada
    };

    try {
        const resposta = await fetch('/questoes/responder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload)
        });

        if (resposta.ok) {
            const resultado = await resposta.json();
            exibirResultado(resultado);
        } else {
            alert("Erro ao validar resposta. Tente novamente.");
            btnAcao.innerHTML = 'Confirmar Resposta';
            btnAcao.disabled = false;
        }
    } catch (error) {
        console.error("Erro na conexão:", error);
        alert("Erro de conexão com o servidor.");
        btnAcao.innerHTML = 'Confirmar Resposta';
        btnAcao.disabled = false;
    }
}

function exibirResultado(resultado) {
    questaoJaRespondida = true;
    document.querySelectorAll('.option-card').forEach(opt => opt.classList.add('locked'));

    const cardSelecionado = document.getElementById(`opt-${alternativaSelecionada}`);

    if (resultado.correto) {
        cardSelecionado.classList.add('correct');
    } else {
        cardSelecionado.classList.add('wrong');
        if (resultado.gabarito) {
            document.getElementById(`opt-${resultado.gabarito.toUpperCase()}`).classList.add('correct');
        }
    }

    document.getElementById('q-explicacao').innerText = resultado.explicação || "Sem explicação disponível.";
    document.getElementById('explanation-section').style.display = 'block';

    const btnAcao = document.getElementById('btn-acao');
    
    if (indiceAtual === filaQuestoes.length - 1) {
        btnAcao.innerHTML = 'Concluir Simulado';
    } else {
        btnAcao.innerHTML = 'Próxima Questão <i class="ph ph-arrow-right" style="margin-left: 5px;"></i>';
    }
    
    btnAcao.disabled = false;
    
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
}