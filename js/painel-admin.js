// Aguarda o DOM carregar completamente antes de disparar a busca na API
document.addEventListener('DOMContentLoaded', carregarDashboardAdmin);

async function carregarDashboardAdmin() {
    const token = localStorage.getItem('token');
    
    try {
        // CORREÇÃO: URL relativa e uso de no-store para evitar cache de rede
        const resposta = await fetch('/admin/dashboard-geral', {
            method: 'GET',
            cache: 'no-store',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true' // CORREÇÃO: Pula o bloqueio no mobile
            }
        });

        if (resposta.ok) {
            const dados = await resposta.json();
            atualizarTelaAdmin(dados);
        } else {
            console.error("Erro ao carregar dados administrativos, status:", resposta.status);
            alert("Erro ao carregar estatísticas. Verifique sua conexão.");
        }
    } catch (error) {
        console.error("Erro na conexão:", error);
        alert("Falha de conexão com o servidor: " + error.message);
    }
}

function atualizarTelaAdmin(dados) {
    // 1. Volumes
    document.getElementById('admin-total-questoes').innerText = dados.metricas_plataforma.questoes_no_banco;
    document.getElementById('admin-total-usuarios').innerText = dados.metricas_plataforma.usuarios_cadastrados;
    document.getElementById('admin-total-respostas').innerText = dados.metricas_plataforma.total_de_respostas_recebidas;

    // 2. Gráfico Circular Global
    const taxa = dados.performance_geral.taxa_de_acerto_media;
    document.getElementById('circle-percentage-admin').textContent = `${Math.round(taxa)}%`;
    document.getElementById('texto-admin-geral').innerHTML = `Média de acertos global de todos os usuários cadastrados na plataforma.`;

    // 3. Disciplinas
    const eng = dados.engajamento;
    document.getElementById('txt-prog-portugues').textContent = `${eng.portugues}%`;
    document.getElementById('txt-prog-matematica').textContent = `${eng.matematica}%`;
    document.getElementById('txt-prog-historia').textContent = `${eng.historia}%`;
    document.getElementById('txt-prog-geografia').textContent = `${eng.geografia}%`;
    document.getElementById('txt-prog-ingles').textContent = `${eng.ingles}%`;

    // 4. Animações
    setTimeout(() => {
        document.getElementById('circle-path-admin').style.strokeDasharray = `${taxa}, 100`;
        
        document.getElementById('bar-prog-portugues').style.width = `${eng.portugues}%`;
        document.getElementById('bar-prog-matematica').style.width = `${eng.matematica}%`;
        document.getElementById('bar-prog-historia').style.width = `${eng.historia}%`;
        document.getElementById('bar-prog-geografia').style.width = `${eng.geografia}%`;
        document.getElementById('bar-prog-ingles').style.width = `${eng.ingles}%`;
    }, 50);
}

/* =======================================================================
    MOTOR DE EXPORTAÇÃO VETORIAL PDF (painel-admin.js)
======================================================================= */
const btnPDFGlobal = document.getElementById('btn-exportar-pdf');

if (btnPDFGlobal) {
    btnPDFGlobal.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const overlay = document.getElementById('loader-transicao-global');
        if (overlay) overlay.classList.add('ativa');

        try {
            // 1. Busca os dados consolidados do servidor
            const resposta = await fetch('/admin/dashboard-estatisticas', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            if (!resposta.ok) throw new Error("Erro ao coletar dados do servidor.");
            const dados = await resposta.json();

            // 2. Inicializa o jsPDF (A4, vertical)
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

            // Cabeçalho estilizado do EXTUDE
            doc.setFillColor(35, 126, 76); // Verde Oficial #237E4C
            doc.rect(0, 0, 210, 35, 'F');
            
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.text("EXTUDE - Relatório Estatístico Global", 14, 18);
            
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(10);
            doc.text("Métricas Consolidadas da Plataforma Administrativa", 14, 26);

            // Tabela 1: Quadro Geral do Sistema
            doc.setTextColor(44, 62, 80);
            doc.setFontSize(11);
            doc.setFont("Helvetica", "bold");
            doc.text("1. Quadro Resumo da Infraestrutura", 14, 48);

            doc.autoTable({
                startY: 52,
                head: [["Métrica Analisada", "Valor Registrado"]],
                body: [
                    ["Total de Alunos Matriculados", dados.resumo.alunos.toString()],
                    ["Total de Questões Cadastradas", dados.resumo.questoes.toString()],
                    ["Volume de Respostas Processadas", dados.resumo.interacoes.toString()],
                    ["Taxa de Assertividade Geral", dados.resumo.assertividade_geral]
                ],
                theme: 'striped',
                headStyles: { fillColor: [44, 62, 80] },
                styles: { fontSize: 10 }
            });

            // Tabela 2: Desempenho Pedagógico por Matéria
            doc.setFont("Helvetica", "bold");
            doc.text("2. Rendimento de Acertos por Disciplina", 14, doc.lastAutoTable.finalY + 12);

            const colMaterias = ["Matéria Básica", "Total de Respostas", "Taxa de Acerto"];
            const rowMaterias = dados.materias.map(m => [m.disciplina, m.tentativas.toString(), m.taxa_acerto]);

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 16,
                head: [colMaterias],
                body: rowMaterias,
                theme: 'striped',
                headStyles: { fillColor: [35, 126, 76] },
                styles: { fontSize: 10 }
            });

            // Tabela 3: Ranking de Alunos
            doc.setFont("Helvetica", "bold");
            doc.text("3. Alunos de Destaque (Top 5)", 14, doc.lastAutoTable.finalY + 12);

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 16,
                head: [["Nome Completo", "E-mail", "Quantidade de Acertos"]],
                body: dados.ranking,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] }, // Azul para destacar o ranking
                styles: { fontSize: 10 }
            });

            // Rodapé com data de emissão
            const dataAtual = new Date().toLocaleString('pt-BR');
            doc.setFontSize(9);
            doc.setFont("Helvetica", "italic");
            doc.setTextColor(127, 130, 134);
            doc.text(`Documento oficial emitido em: ${dataAtual}. Dados indexados via SQLite.`, 14, doc.lastAutoTable.finalY + 15);

            // 3. Dispara o download automático do arquivo vetorial
            doc.save(`EXTUDE_Relatorio_Estatistico.pdf`);

        } catch (erro) {
            console.error("Erro fatal na geração:", erro);
            alert("Erro ao gerar PDF. Verifique o terminal do VS Code.");
        } finally {
            if (overlay) overlay.classList.remove('ativa');
        }
    });
}