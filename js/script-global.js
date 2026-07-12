/* =======================================================================
    ALERTA PERSONALIZADO / TOAST (No topo da tela)
======================================================================= */
function mostrarAlerta(mensagem, tipo = 'error') {
    const alertaAntigo = document.getElementById('toast-notification');
    if (alertaAntigo) {
        alertaAntigo.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast';

    const ehSucesso = (tipo === 'success' || tipo === 'sucesso');
    toast.classList.add(ehSucesso ? 'success' : 'error');
    const iconeClass = ehSucesso ? 'ph-check-circle' : 'ph-warning-circle';

    toast.innerHTML = `
        <i class="ph ph-fill ${iconeClass}"></i>
        <span>${mensagem}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('mostrar');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('mostrar');
        toast.classList.add('esconder');

        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.remove();
            }
        }, 400);
    }, 3500);
}

/* =======================================================================
    MODAL DE CONFIRMAÇÃO E ALERTA (Substitui alert e confirm nativos)
======================================================================= */

// Substitui o confirm()
// Uso: mostrarModalConfirmacao("Atenção", "Tem certeza?", "Sim, excluir", "danger", () => { funcaoAoConfirmar() })
function mostrarModalConfirmacao(titulo, mensagem, textoBotao, tipoCor = 'danger', callbackConfirmar) {
    const modalExistente = document.getElementById('custom-modal-overlay');
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    overlay.className = 'modal-overlay';

    let icone = 'ph-warning-circle';
    let corIcone = '#ff5555'; // Padrão danger

    if (tipoCor === 'success') { icone = 'ph-check-circle'; corIcone = '#237e4c'; }
    if (tipoCor === 'info') { icone = 'ph-info'; corIcone = '#3b82f6'; }

    overlay.innerHTML = `
        <div class="custom-modal">
            <div class="custom-modal-header">
                <i class="ph ${icone}" style="color: ${corIcone}; font-size: 3rem;"></i>
                <h3 class="custom-modal-title">${titulo}</h3>
            </div>
            <div class="custom-modal-body">
                ${mensagem}
            </div>
            <div class="custom-modal-footer">
                <button class="btn-modal-cancel" id="btn-modal-cancel">Cancelar</button>
                <button class="btn-modal-action ${tipoCor}" id="btn-modal-confirm">${textoBotao}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-modal-cancel').addEventListener('click', () => {
        overlay.remove();
    });

    document.getElementById('btn-modal-confirm').addEventListener('click', () => {
        callbackConfirmar();
        overlay.remove();
    });
}

// Substitui o alert() fixo na tela
function mostrarModalAlerta(titulo, mensagem, tipoCor = 'info', callbackPosAlerta = null) {
    const modalExistente = document.getElementById('custom-modal-overlay');
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    overlay.className = 'modal-overlay';

    let icone = 'ph-info';
    let corIcone = '#3b82f6';

    if (tipoCor === 'danger') { icone = 'ph-warning-circle'; corIcone = '#ff5555'; }
    if (tipoCor === 'success') { icone = 'ph-check-circle'; corIcone = '#237e4c'; }

    overlay.innerHTML = `
        <div class="custom-modal">
            <div class="custom-modal-header">
                <i class="ph ${icone}" style="color: ${corIcone}; font-size: 3rem;"></i>
                <h3 class="custom-modal-title">${titulo}</h3>
            </div>
            <div class="custom-modal-body">
                ${mensagem}
            </div>
            <div class="custom-modal-footer">
                <button class="btn-modal-action ${tipoCor}" id="btn-modal-ok" style="flex: 1;">Entendi</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-modal-ok').addEventListener('click', () => {
        overlay.remove();
        if (callbackPosAlerta) callbackPosAlerta();
    });
}

/* =======================================================================
    FUNÇÃO DE RETORNO DE PÁGINA
======================================================================= */
function voltarPagina(event) {
    event.preventDefault();
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'painel-admin.html';
    }
}

/* =======================================================================
    FUNÇÃO PARA CONTROLE DE SESSÃO
======================================================================= */
async function fetchProtegido(url, opcoes = {}) {
    const token = localStorage.getItem('token');

    opcoes.headers = {
        ...opcoes.headers,
        'Authorization': `Bearer ${token}`
    };

    const resposta = await fetch(url, opcoes);

    if (resposta.status === 401) {
        // Usa o novo modal bonito no lugar do alert()
        mostrarModalAlerta(
            "Sessão Expirada",
            "Sua sessão expirou por segurança. Por favor, faça login novamente.",
            "info",
            () => {
                localStorage.clear();
                window.location.href = "/login.html";
            }
        );
        return;
    }

    return resposta;
}

let tempoInativo;

function resetarTimer() {
    clearTimeout(tempoInativo);

    tempoInativo = setTimeout(() => {
        // Usa o novo modal bonito no lugar do alert()
        mostrarModalAlerta(
            "Ausência Detectada",
            "Você foi deslogado por inatividade para proteger seus dados.",
            "info",
            () => {
                localStorage.clear();
                window.location.href = "/login.html";
            }
        );
    }, 15 * 60 * 1000);
}

window.onload = resetarTimer;
document.onmousemove = resetarTimer;
document.onkeydown = resetarTimer;
document.onclick = resetarTimer;


/* =======================================================================
    OVERLAY DE TRANSIÇÃO DE TELAS (Abordagem Híbrida Unificada)
======================================================================= */

// 1. Injeta o loader imediatamente assim que o script é lido para evitar telas em branco
(function iniciarLoaderGlobal() {
    // Só cria se o elemento já não existir na página
    if (!document.getElementById('loader-transicao-global')) {
        const overlay = document.createElement('div');
        overlay.id = 'loader-transicao-global';
        overlay.className = 'transicao-overlay ativa'; // Começa ativa (cobrindo a tela com desfoque)
        overlay.innerHTML = `
            <div class="transicao-spinner"></div>
            <span class="transicao-texto">Carregando...</span>
        `;

        // Se o body já estiver pronto, insere logo no início. Caso contrário, espera o DOM
        if (document.body) {
            document.body.insertBefore(overlay, document.body.firstChild);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.insertBefore(overlay, document.body.firstChild);
            });
        }
    }
})();

// 2. Quando a nova página terminar de carregar por completo (HTML + dados do Backend)
window.addEventListener('load', () => {
    const overlay = document.getElementById('loader-transicao-global');
    if (overlay) {
        // Remove a classe 'ativa' para iniciar a animação de esmaecimento (fade-out) do CSS
        setTimeout(() => {
            overlay.classList.remove('ativa');
        }, 100);
    }
});

// 3. Intercepta os cliques em links internos para fechar a cortina antes de mudar de página
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');

    // Só intercepta links válidos, que não abram em nova aba e ignora comandos javascript puros
    if (link && link.href && link.getAttribute('target') !== '_blank') {
        const urlObj = new URL(link.href);

        if (urlObj.origin === window.location.origin && !link.href.includes('javascript:')) {

            e.preventDefault(); // Segura o redirecionamento padrão do navegador por um instante

            const overlay = document.getElementById('loader-transicao-global');
            if (overlay) {
                overlay.classList.add('ativa'); // Ativa o desfoque suave na tela atual
            }

            // Aguarda o tempo exato do efeito de transição do CSS (250ms) e muda de página REAL
            setTimeout(() => {
                window.location.href = link.href;
            }, 250);
        }
    }
});

// 4. Corrige o comportamento se o usuário usar os botões "Avançar" ou "Voltar" do próprio celular
window.addEventListener('pageshow', (event) => {
    // Se a página foi recuperada da memória cache do celular, garante que a animação suma
    if (event.persisted) {
        const overlay = document.getElementById('loader-transicao-global');
        if (overlay) {
            overlay.classList.remove('ativa');
        }
    }
});

/* =======================================================================
    TRANSIÇÃO DE PASSOS INTERNOS (Mesma página / Steps)
======================================================================= */
function mudarPassoComTransicao(funcaoTrocaConteudo) {
    const overlay = document.getElementById('loader-transicao-global');

    if (overlay) {
        // 1. Fecha a cortina aplicando o desfoque na tela atual
        overlay.classList.add('ativa');

        // 2. Aguarda o tempo da animação do CSS (250ms)
        setTimeout(() => {

            // 3. Executa a função que esconde o passo antigo e mostra o novo
            funcaoTrocaConteudo();

            // Rola a tela para o topo por garantia visual
            window.scrollTo(0, 0);

            // 4. Abre a cortina esmaecendo o desfoque
            setTimeout(() => {
                overlay.classList.remove('ativa');
            }, 50);

        }, 250);
    } else {
        // Plano de contingência: se a overlay não existir por algum motivo, muda direto
        funcaoTrocaConteudo();
    }
}

/* =======================================================================
    REGISTRO DO SERVICE WORKER (PWA)
======================================================================= */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Lembre-se: o sw.js precisa estar sendo servido na RAIZ (/sw.js) pelo seu backend
        navigator.serviceWorker.register('assets/sw.js')
            .then(reg => console.log('PWA: Service Worker registrado com sucesso!', reg.scope))
            .catch(err => console.error('PWA: Falha ao registrar o Service Worker!', err));
    });
}

/* =======================================================================
    FECHAMENTO AUTOMÁTICO DO TECLADO VIRTUAL (Mobile PWA)
======================================================================= */
document.addEventListener('submit', (event) => {
    // Verifica se existe algum elemento focado na tela
    if (document.activeElement) {
        // Confirma se o elemento focado é um campo de texto ou área de texto
        const tagAtiva = document.activeElement.tagName;
        if (tagAtiva === 'INPUT' || tagAtiva === 'TEXTAREA') {
            document.activeElement.blur(); // Tira o foco e recolhe o teclado imediatamente
        }
    }
});