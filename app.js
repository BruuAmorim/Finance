// ===============================
//  VARIÁVEIS GLOBAIS
// ===============================
let transactions = [];
let faturasParceladas = [];
let despesasRecorrentes = [];
let receitasRecorrentes = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentUser = null;
let isLoggedIn = false;
let currentAuthForm = 'login'; // 'login' ou 'cadastro'

// ===============================
//  CONFIGURAÇÃO DO NOCODB
// ===============================
// URL oficial informada:
// https://app.nocodb.com/api/v2/tables/mht7b7fomr6g2it/records?offset=0&limit=25&where=&viewId=vwp00extw4gab91s
// Usaremos a parte base + construímos os parâmetros via URLSearchParams.
const NOCODB_API_TOKEN = 'YXvXeKm4xqldUZIZxtwt8tslZxStu08SqXr2mOs_';
const NOCODB_BASE_URL = 'https://app.nocodb.com/api/v2/tables/mht7b7fomr6g2it/records';
const NOCODB_VIEW_ID = 'vwp00extw4gab91s';
let USE_NOCODB = true; // Flag para habilitar/desabilitar NocoDB

// ===============================
//  CARREGAR DO LOCALSTORAGE
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const dados = localStorage.getItem("transactions");
    const dadosFaturas = localStorage.getItem("faturasParceladas");

    if (dados) {
        transactions = JSON.parse(dados);
    }

    if (dadosFaturas) {
        faturasParceladas = JSON.parse(dadosFaturas);
        // Garantir que faturas antigas tenham o campo ativa
        faturasParceladas.forEach(fatura => {
            if (fatura.ativa === undefined) {
                fatura.ativa = true;
            }
        });
        if (faturasParceladas.length > 0) {
            salvarFaturasLocal();
        }
    }

    const dadosDespesasRecorrentes = localStorage.getItem("despesasRecorrentes");
    if (dadosDespesasRecorrentes) {
        despesasRecorrentes = JSON.parse(dadosDespesasRecorrentes);
    }

    const dadosReceitasRecorrentes = localStorage.getItem("receitasRecorrentes");
    if (dadosReceitasRecorrentes) {
        receitasRecorrentes = JSON.parse(dadosReceitasRecorrentes);
    }

    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    const hoje = new Date();
    const faturaDataInicio = document.getElementById('faturaDataInicio');
    if (faturaDataInicio) {
        faturaDataInicio.valueAsDate = hoje;
    }
    // Dia de pagamento padrão: dia 10
    const faturaDiaPagamento = document.getElementById('faturaDiaPagamento');
    if (faturaDiaPagamento) {
        faturaDiaPagamento.value = 10;
    }
    // Verificar se usuário está logado
    verificarLogin();
    atualizarUIUsuario();
    
    initCharts();
    
    // Gerar transações automáticas de despesas recorrentes, receitas recorrentes e despesas cartões
    gerarTransacoesRecorrentes();
    gerarTransacoesReceitasRecorrentes();
    gerarTransacoesFaturasParceladas();
    
    // Configurar valores padrão dos seletores de PDF
    const pdfMesSelect = document.getElementById('pdfMes');
    const pdfAnoInput = document.getElementById('pdfAno');
    if (pdfMesSelect) {
        pdfMesSelect.value = currentMonth;
    }
    if (pdfAnoInput) {
        pdfAnoInput.value = currentYear;
    }
    
    updateUI(currentMonth, currentYear);
    atualizarTabelaFaturas();
    atualizarTabelaDespesasRecorrentes();
    atualizarTabelaReceitasRecorrentes();
    
    // Adicionar event listener ao formulário
    const form = document.getElementById("expenseForm");
    if (form) {
        form.addEventListener("submit", addTransaction);
    }

    // Adicionar event listener ao formulário de faturas
    const faturaForm = document.getElementById("faturaForm");
    if (faturaForm) {
        faturaForm.addEventListener("submit", adicionarFaturaParcelada);
    }

    // Adicionar event listener ao formulário de despesas recorrentes
    const despesaRecorrenteForm = document.getElementById("despesaRecorrenteForm");
    if (despesaRecorrenteForm) {
        despesaRecorrenteForm.addEventListener("submit", adicionarDespesaRecorrente);
    }

    // Adicionar event listener ao formulário de receitas recorrentes
    const receitaRecorrenteForm = document.getElementById("receitaRecorrenteForm");
    if (receitaRecorrenteForm) {
        receitaRecorrenteForm.addEventListener("submit", adicionarReceitaRecorrente);
    }

    // Event listeners removidos - não são mais necessários

    // Carregar preferência de modo escuro
    carregarModoEscuro();
});

// ===============================
//  SALVAR NO LOCALSTORAGE
// ===============================
function salvarLocal() {
    // Somente persiste se houver usuário logado
    if (isLoggedIn && currentUser) {
        localStorage.setItem("transactions", JSON.stringify(transactions));
        atualizarBackupUsuarioLocal();
    } else {
        // Visitante sem login: não manter dados após recarregar
        localStorage.removeItem("transactions");
    }
}

// ===============================
//  INICIALIZAÇÃO DOS GRÁFICOS
// ===============================
let lineChart, pieChart;

function initCharts() {
    const lineChartEl = document.getElementById('lineChart');
    const pieChartEl = document.getElementById('pieChart');
    
    if (!lineChartEl || !pieChartEl) {
        console.warn('Elementos dos gráficos não encontrados');
        return;
    }
    
    const ctxLine = lineChartEl.getContext('2d');
    const ctxPie = pieChartEl.getContext('2d');

    let gradient = ctxLine.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(66,165,245,0.5)');
    gradient.addColorStop(1, 'rgba(66,165,245,0.0)');

    lineChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
            datasets: [{
                label: 'Saldo',
                data: [0, 1500, 1200, 2000],
                borderColor: '#0d47a1',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    pieChart = new Chart(ctxPie, {
        type: 'pie',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#0d47a1','#42a5f5','#90caf9','#e3f2fd'], borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ===============================
//  ATUALIZAR MÊS DE REFERÊNCIA
// ===============================
function atualizarMesReferencia(mes, ano) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const nomeMes = meses[mes];
    const mesReferenciaEl = document.getElementById('mesReferencia');
    if (mesReferenciaEl) {
        mesReferenciaEl.textContent = `${nomeMes} / ${ano}`;
    }
}

// ===============================
//  ATUALIZAR INTERFACE
// ===============================
function updateUI(filterMonth = null, filterYear = null) {
    const listSimple = document.getElementById('transactionListSimple');
    const tableBody = document.querySelector('#summaryTable tbody');
    const totalReceitasEl = document.getElementById('totalReceitas');
    const totalDespesasEl = document.getElementById('totalDespesas');
    const saldoMesEl = document.getElementById('saldoMes');

    if (listSimple) listSimple.innerHTML = "";
    if (tableBody) tableBody.innerHTML = "";

    // Filtrar transações se um mês/ano específico foi solicitado
    let transacoesParaExibir = transactions;
    if (filterMonth !== null && filterYear !== null) {
        transacoesParaExibir = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
        });
        // Atualizar mês de referência
        atualizarMesReferencia(filterMonth, filterYear);
    } else {
        // Se não há filtro, mostrar mês atual
        atualizarMesReferencia(currentMonth, currentYear);
    }

    let total = 0;
    let descriptions = {};
    let receitas = 0;
    let despesas = 0;

    transacoesParaExibir.forEach(t => {
        if (t.type === "Receita") {
            total += t.amount;
            receitas += t.amount;
        } else {
            total -= t.amount;
            despesas += t.amount;
        }

        const desc = t.obs || t.category || 'Sem descrição';
        if (!descriptions[desc]) descriptions[desc] = 0;
        descriptions[desc] += t.amount;

        const money = t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (listSimple) {
            listSimple.innerHTML += `
                <div class="transaction-item">
                    <div class="t-info">
                        <h4>${desc}</h4>
                        <span>${t.date}</span>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <span class="t-value ${t.type === "Receita" ? "income" : "expense"}">
                            ${t.type === "Receita" ? "+" : "-"} ${money}
                        </span>
                        <i class="fas fa-trash-alt" onclick="removeTransaction(${t.id})"></i>
                    </div>
                </div>
            `;
        }

        // Mostrar OBS apenas para despesas recorrentes e despesas cartão
        let obsDisplay = "";
        if (t.recorrenteId || t.faturaId) {
            obsDisplay = t.obs || "";
        }

        if (tableBody) {
            tableBody.innerHTML += `
                <tr>
                    <td>${t.date}</td>
                    <td>${desc}</td>
                    <td style="color:${t.type === "Receita" ? "#66bb6a" : "#e53935"}">${t.type}</td>
                    <td>${money}</td>
                    <td>${obsDisplay}</td>
                </tr>
            `;
        }
    });

    // Atualizar estatísticas do mês
    if (totalReceitasEl) {
        totalReceitasEl.innerText = receitas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    if (totalDespesasEl) {
        totalDespesasEl.innerText = despesas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    if (saldoMesEl) {
        const saldo = receitas - despesas;
        saldoMesEl.innerText = saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    // Atualizar totais de despesas recorrentes e despesas cartões
    atualizarTotaisRecorrentes(filterMonth, filterYear);

    // Atualizar gráfico de pizza
    if (pieChart) {
        pieChart.data.labels = Object.keys(descriptions);
        pieChart.data.datasets[0].data = Object.values(descriptions);
        pieChart.update();
    }

    // Atualizar gráfico de linha com dados semanais do mês
    atualizarGraficoLinha(transacoesParaExibir, filterMonth, filterYear);
}
// ===============================
//  ADICIONAR TRANSAÇÃO
// ===============================
function addTransaction(e) {
    e.preventDefault();

    const date = document.getElementById("date").value;
    const type = document.getElementById("type").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const descricao = document.getElementById("descricao").value.trim();
    const obs = document.getElementById("obs").value.trim();

    // Validação
    if (!date || !descricao || isNaN(amount) || amount <= 0) {
        alert("Preencha todos os campos obrigatórios corretamente! O valor deve ser maior que zero.");
        return;
    }

    const nova = {
        id: Date.now(),
        date, 
        type, 
        category: descricao,
        amount,
        obs: obs || ""
    };

    transactions.push(nova);
    salvarLocal();
    
    // Atualizar para o mês da transação adicionada
    const dataTransacao = new Date(date);
    currentMonth = dataTransacao.getMonth();
    currentYear = dataTransacao.getFullYear();
    
    updateUI(currentMonth, currentYear);
    clearForm();
    
    // Feedback visual
    const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
    if (submitBtn) {
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "✓ Adicionado!";
        submitBtn.style.backgroundColor = "#66bb6a";
        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.style.backgroundColor = "";
        }, 1500);
    }
}

// ===============================
//  REMOVER TRANSAÇÃO
// ===============================
function removeTransaction(id) {
    if (!confirm("Deseja remover?")) return;

    transactions = transactions.filter(t => t.id !== id);
    salvarLocal();
    updateUI(currentMonth, currentYear);
}

// ===============================
//  LIMPAR FORMULÁRIO
// ===============================
function clearForm() {
    const form = document.getElementById("expenseForm");
    if (form) {
        form.reset();
        const dateInput = document.getElementById("date");
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
    }
}

// ===============================
//  CSV
// ===============================
// ===============================
//  EXPORTAR EXCEL - VERSÃO MELHORADA
// ===============================
function exportExcel() {
    try {
        // Criar workbook
        const wb = XLSX.utils.book_new();

        // Organizar transações por mês e ano
        const transacoesPorMes = {};
        
        transactions.forEach(t => {
            try {
                const data = new Date(t.date + 'T00:00:00');
                if (isNaN(data.getTime())) {
                    // Tentar formato alternativo
                    const partes = t.date.split('-');
                    if (partes.length === 3) {
                        const dataAlt = new Date(partes[0], partes[1] - 1, partes[2]);
                        if (!isNaN(dataAlt.getTime())) {
                            const mes = dataAlt.getMonth() + 1;
                            const ano = dataAlt.getFullYear();
                            const chave = `${ano}-${String(mes).padStart(2, '0')}`;
                            
                            if (!transacoesPorMes[chave]) {
                                transacoesPorMes[chave] = [];
                            }
                            
                            transacoesPorMes[chave].push({
                                ...t,
                                mesNumero: mes,
                                ano: ano,
                                dataObj: dataAlt
                            });
                        }
                    }
                } else {
                    const mes = data.getMonth() + 1;
                    const ano = data.getFullYear();
                    const chave = `${ano}-${String(mes).padStart(2, '0')}`;
                    
                    if (!transacoesPorMes[chave]) {
                        transacoesPorMes[chave] = [];
                    }
                    
                    transacoesPorMes[chave].push({
                        ...t,
                        mesNumero: mes,
                        ano: ano,
                        dataObj: data
                    });
                }
            } catch (e) {
                console.warn('Erro ao processar transação:', t, e);
            }
        });

        // Ordenar chaves (meses/anos)
        const chavesOrdenadas = Object.keys(transacoesPorMes).sort();
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        // Processar cada mês
        chavesOrdenadas.forEach(chave => {
            const transacoesMes = transacoesPorMes[chave];
            if (!transacoesMes || transacoesMes.length === 0) return;
            
            const mesNome = meses[transacoesMes[0].mesNumero - 1];
            const ano = transacoesMes[0].ano;
            const nomeAba = `${mesNome}_${ano}`.substring(0, 31); // Limite de caracteres do Excel

            // Preparar dados para a planilha
            const dadosPlanilha = [];

            // Cabeçalho com estilo profissional
            dadosPlanilha.push([
                'Identificação',
                'Data',
                'Mês',
                'Ano',
                'Categoria',
                'Tipo',
                'Valor (R$)',
                'Observação'
            ]);

            // Adicionar linhas de dados
            let receitasMes = 0;
            let despesasMes = 0;

            transacoesMes.forEach((t, idx) => {
                const dataObj = t.dataObj || new Date(t.date);
                const dia = String(dataObj.getDate()).padStart(2, '0');
                const mesFormatado = String(dataObj.getMonth() + 1).padStart(2, '0');
                const anoFormatado = dataObj.getFullYear();
                const dataFormatada = `${dia}/${mesFormatado}/${anoFormatado}`;

                if (t.type === 'Receita') {
                    receitasMes += t.amount;
                } else {
                    despesasMes += t.amount;
                }

                // Criar identificação única
                const desc = t.obs || t.category || 'Sem descrição';
                const identificacao = `${t.type.substring(0, 3).toUpperCase()}_${desc.toUpperCase().replace(/\s+/g, '_')}_${String(idx + 1).padStart(3, '0')}`;

                dadosPlanilha.push([
                    identificacao,
                    dataFormatada,
                    mesNome,
                    ano,
                    desc,
                    t.type,
                    t.amount,
                    t.obs || ''
                ]);
            });

            // Adicionar linha de totais
            dadosPlanilha.push([]); // Linha vazia
            dadosPlanilha.push(['', '', '', '', '', 'TOTAL RECEITAS', receitasMes, '']);
            dadosPlanilha.push(['', '', '', '', '', 'TOTAL DESPESAS', despesasMes, '']);
            dadosPlanilha.push(['', '', '', '', '', 'SALDO DO MÊS', receitasMes - despesasMes, '']);

            // Criar worksheet
            const ws = XLSX.utils.aoa_to_sheet(dadosPlanilha);

            // Definir larguras das colunas
            ws['!cols'] = [
                { wch: 30 }, // Identificação
                { wch: 12 }, // Data
                { wch: 12 }, // Mês
                { wch: 8 },  // Ano
                { wch: 25 }, // Categoria
                { wch: 15 }, // Tipo
                { wch: 18 }, // Valor
                { wch: 40 }  // Observação
            ];

            // Formatar valores monetários
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let row = 1; row <= range.e.r; row++) {
                const cellValor = XLSX.utils.encode_cell({ r: row, c: 6 }); // Coluna Valor (G)
                if (ws[cellValor] && typeof ws[cellValor].v === 'number') {
                    ws[cellValor].z = '"R$"#,##0.00';
                }
            }

            // Adicionar filtro automático
            if (dadosPlanilha.length > 1) {
                ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: transacoesMes.length, c: 7 } }) };
            }

            // Adicionar worksheet ao workbook
            XLSX.utils.book_append_sheet(wb, ws, nomeAba);
        });

        // Criar planilha de resumo geral
        const dadosResumo = [];
        dadosResumo.push(['RESUMO FINANCEIRO - EVACLOUDD FINANCE']);
        dadosResumo.push([]);
        dadosResumo.push(['Período', 'Receitas (R$)', 'Despesas (R$)', 'Saldo (R$)', 'Percentual Despesas/Receitas']);

        let totalReceitas = 0;
        let totalDespesas = 0;

        chavesOrdenadas.forEach(chave => {
            const transacoesMes = transacoesPorMes[chave];
            if (!transacoesMes || transacoesMes.length === 0) return;
            
            const mesNome = meses[transacoesMes[0].mesNumero - 1];
            const ano = transacoesMes[0].ano;
            
            let receitasMes = 0;
            let despesasMes = 0;

            transacoesMes.forEach(t => {
                if (t.type === 'Receita') {
                    receitasMes += t.amount;
                    totalReceitas += t.amount;
                } else {
                    despesasMes += t.amount;
                    totalDespesas += t.amount;
                }
            });

            const saldo = receitasMes - despesasMes;
            const percentual = receitasMes > 0 ? (despesasMes / receitasMes) * 100 : 0;

            dadosResumo.push([
                `${mesNome}/${ano}`,
                receitasMes,
                despesasMes,
                saldo,
                percentual
            ]);
        });

        dadosResumo.push([]);
        dadosResumo.push(['TOTAL GERAL', totalReceitas, totalDespesas, totalReceitas - totalDespesas, 
                         totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0]);

        const wsResumo = XLSX.utils.aoa_to_sheet(dadosResumo);
        wsResumo['!cols'] = [
            { wch: 20 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 30 }
        ];

        // Formatar valores monetários no resumo
        const rangeResumo = XLSX.utils.decode_range(wsResumo['!ref']);
        for (let row = 3; row <= rangeResumo.e.r; row++) {
            for (let col = 1; col <= 3; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                if (wsResumo[cellAddress] && typeof wsResumo[cellAddress].v === 'number') {
                    wsResumo[cellAddress].z = '"R$"#,##0.00';
                }
            }
            // Coluna de percentual
            const cellPercent = XLSX.utils.encode_cell({ r: row, c: 4 });
            if (wsResumo[cellPercent] && typeof wsResumo[cellPercent].v === 'number') {
                wsResumo[cellPercent].z = '0.00"%"';
            }
        }

        XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo_Geral");

        // Gerar nome do arquivo com data
        const hoje = new Date();
        const dataStr = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;
        const nomeArquivo = `Relatorio_Financeiro_EvaCloudd_${dataStr}.xlsx`;

        // Salvar arquivo
        XLSX.writeFile(wb, nomeArquivo);

        // Feedback visual
        alert(`✅ Arquivo Excel exportado com sucesso!\n\nArquivo: ${nomeArquivo}\n\nO arquivo contém:\n- Planilhas separadas por mês\n- Filtros automáticos nas colunas\n- Formatação de moeda (R$)\n- Resumo geral consolidado`);
    } catch (error) {
        console.error('Erro ao exportar Excel:', error);
        alert('❌ Erro ao exportar arquivo Excel. Verifique o console para mais detalhes.');
    }
}

// Função mantida para compatibilidade
function exportCSV() {
    exportExcel(); // Redireciona para Excel
}

// ===============================
//  PDF
// ===============================
function generatePDF() {
    const element = document.getElementById("reportArea");
    html2pdf().from(element).save("relatorio_financeiro.pdf");
}

// ===============================
//  GERAR PDF POR MÊS
// ===============================
function gerarPDFSelecionado() {
    const mesSelect = document.getElementById('pdfMes');
    const anoInput = document.getElementById('pdfAno');
    
    if (!mesSelect || !anoInput) {
        alert("Erro ao encontrar os campos de seleção!");
        return;
    }
    
    const mes = parseInt(mesSelect.value);
    const ano = parseInt(anoInput.value);
    
    if (isNaN(mes) || isNaN(ano) || ano < 2020 || ano > 2100) {
        alert("Por favor, selecione um mês e ano válidos!");
        return;
    }
    
    gerarPDFMes(mes, ano);
}

function gerarPDFMes(mes, ano) {
    // Se receber apenas um parâmetro (offset), manter compatibilidade
    if (arguments.length === 1) {
        const hoje = new Date();
        hoje.setMonth(hoje.getMonth() + mes);
        mes = hoje.getMonth();
        ano = hoje.getFullYear();
    }
    
    // Obter dados do mês
    const rel = gerarRelatorioMensal(ano, mes);
    
    // Criar um elemento temporário para o PDF
    const tempDiv = document.createElement('div');
    tempDiv.style.width = '800px';
    tempDiv.style.padding = '20px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'Poppins, sans-serif';
    
    // Nome do mês em português
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const nomeMes = meses[mes];
    
    // Cabeçalho do PDF
    tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0d47a1; padding-bottom: 15px;">
            <h1 style="color: #0d47a1; margin: 0; font-size: 24px;">EvaCloudd Finance</h1>
            <h2 style="color: #333; margin: 10px 0 0 0; font-size: 18px; font-weight: 500;">Relatório Financeiro - ${nomeMes}/${ano}</h2>
        </div>
        
        <div style="margin-bottom: 30px; background: #f5f9ff; padding: 15px; border-radius: 10px;">
            <h3 style="color: #0d47a1; margin: 0 0 15px 0; font-size: 16px;">Resumo do Mês</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                <div>
                    <div style="color: #666; font-size: 12px; margin-bottom: 5px;">Receitas</div>
                    <div style="color: #66bb6a; font-size: 20px; font-weight: 700;">${rel.receitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>
                <div>
                    <div style="color: #666; font-size: 12px; margin-bottom: 5px;">Despesas</div>
                    <div style="color: #e53935; font-size: 20px; font-weight: 700;">${rel.despesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>
                <div>
                    <div style="color: #666; font-size: 12px; margin-bottom: 5px;">Saldo</div>
                    <div style="color: ${rel.saldo >= 0 ? '#66bb6a' : '#e53935'}; font-size: 20px; font-weight: 700;">${rel.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h3 style="color: #0d47a1; margin: 0 0 15px 0; font-size: 16px;">Transações Detalhadas</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #0d47a1; color: white;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Data</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Categoria</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Tipo</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Valor</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Observação</th>
                    </tr>
                </thead>
                <tbody>
                    ${rel.itens.length > 0 ? rel.itens.map(t => {
                        const money = t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        const obsDisplay = (t.recorrenteId || t.faturaId) ? (t.obs || "-") : "-";
                        return `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px; border: 1px solid #ddd;">${t.date}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${t.obs || t.category || 'Sem descrição'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; color: ${t.type === "Receita" ? "#66bb6a" : "#e53935"};">${t.type}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${money}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${obsDisplay}</td>
                            </tr>
                        `;
                    }).join('') : `
                        <tr>
                            <td colspan="5" style="padding: 20px; text-align: center; color: #999; border: 1px solid #ddd;">Nenhuma transação encontrada para este mês.</td>
                        </tr>
                    `}
                </tbody>
            </table>
        </div>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 10px;">
            <p>EvaCloudd Finance • O seu ecossistema de controle financeiro</p>
            <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
    `;
    
    // Adicionar ao body temporariamente
    document.body.appendChild(tempDiv);
    
    // Gerar PDF
    const opcoes = {
        margin: [10, 10, 10, 10],
        filename: `relatorio_${nomeMes}_${ano}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opcoes).from(tempDiv).save().then(() => {
        // Remover elemento temporário
        document.body.removeChild(tempDiv);
    });
}

// ===============================
//  RELATÓRIO MENSAL
// ===============================
function gerarRelatorioMensal(ano, mes) {
    const filtradas = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === mes && d.getFullYear() === ano;
    });

    let receitas = 0;
    let despesas = 0;

    filtradas.forEach(t => {
        if (t.type === "Receita") receitas += t.amount;
        else despesas += t.amount;
    });

    return {
        ano, mes,
        receitas, despesas,
        saldo: receitas - despesas,
        itens: filtradas
    };
}

function mostrarRelatorio(offset) {
    const hoje = new Date();
    hoje.setMonth(hoje.getMonth() + offset);
    
    currentMonth = hoje.getMonth();
    currentYear = hoje.getFullYear();

    const rel = gerarRelatorioMensal(currentYear, currentMonth);

    // Atualizar a UI com os dados do mês selecionado
    updateUI(currentMonth, currentYear);

    // Mostrar informações do mês no console (opcional, pode remover se não quiser)
    console.log(
        `📆 ${currentMonth + 1}/${currentYear}\n` +
        `Receitas: R$ ${rel.receitas.toFixed(2)}\n` +
        `Despesas: R$ ${rel.despesas.toFixed(2)}\n` +
        `Saldo: R$ ${rel.saldo.toFixed(2)}`
    );
}

// ===============================
//  ATUALIZAR GRÁFICO DE LINHA
// ===============================
function atualizarGraficoLinha(transacoes, mes, ano) {
    if (!lineChart) return;
    
    if (!transacoes || transacoes.length === 0) {
        lineChart.data.datasets[0].data = [0, 0, 0, 0];
        lineChart.update();
        return;
    }

    // Organizar transações por semana do mês
    const semanas = [[], [], [], []];
    let saldoAcumulado = 0;

    transacoes.sort((a, b) => new Date(a.date) - new Date(b.date));

    transacoes.forEach(t => {
        const d = new Date(t.date);
        const dia = d.getDate();
        const semana = Math.min(Math.floor((dia - 1) / 7), 3);
        
        if (t.type === "Receita") {
            saldoAcumulado += t.amount;
        } else {
            saldoAcumulado -= t.amount;
        }
        
        semanas[semana].push(saldoAcumulado);
    });

    // Pegar o último saldo de cada semana
    const dadosSemanas = semanas.map(sem => sem.length > 0 ? sem[sem.length - 1] : 0);
    
    // Se não houver dados, usar saldo inicial de 0
    if (dadosSemanas.every(v => v === 0)) {
        dadosSemanas[0] = 0;
    }

    lineChart.data.datasets[0].data = dadosSemanas;
    lineChart.update();
}

// ===============================
//  DESPESAS CARTÕES
// ===============================

function salvarFaturasLocal() {
    // Somente persiste se houver usuário logado
    if (isLoggedIn && currentUser) {
        localStorage.setItem("faturasParceladas", JSON.stringify(faturasParceladas));
        atualizarBackupUsuarioLocal();
    } else {
        localStorage.removeItem("faturasParceladas");
    }
}

function toggleFaturaForm() {
    const container = document.getElementById('faturaFormContainer');
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
}

// Funções removidas - não são mais necessárias com dia de pagamento

function adicionarFaturaParcelada(e) {
    e.preventDefault();

    const cartao = document.getElementById('faturaCartao').value.trim();
    const banco = document.getElementById('faturaBanco').value.trim();
    const valorTotal = parseFloat(document.getElementById('faturaValorTotal').value);
    const parcelas = parseInt(document.getElementById('faturaParcelas').value);
    const dataInicio = document.getElementById('faturaDataInicio').value;
    const diaPagamento = parseInt(document.getElementById('faturaDiaPagamento').value);
    const parcelasPagas = parseInt(document.getElementById('faturaParcelasPagas').value) || 0;
    const taxaJuros = parseFloat(document.getElementById('faturaTaxaJuros').value);
    const descricao = document.getElementById('faturaDescricao').value.trim();

    if (!cartao || !banco || isNaN(valorTotal) || valorTotal <= 0 || !parcelas || parcelas <= 0 || !dataInicio || !diaPagamento || diaPagamento < 1 || diaPagamento > 31) {
        alert("Preencha todos os campos obrigatórios corretamente! O dia de pagamento deve ser entre 1 e 31.");
        return;
    }

    if (parcelasPagas < 0 || parcelasPagas >= parcelas) {
        alert("O número de parcelas pagas deve ser menor que o total de parcelas!");
        return;
    }

    const valorParcela = valorTotal / parcelas;
    const dataInicioObj = new Date(dataInicio);
    
    // Calcular datas das parcelas baseadas no dia de pagamento
    const parcelasDetalhes = [];
    for (let i = 0; i < parcelas; i++) {
        // Calcular data da parcela baseada no dia de pagamento
        const dataParcela = new Date(dataInicioObj);
        dataParcela.setMonth(dataParcela.getMonth() + i);
        
        // Ajustar para o dia de pagamento do cartão
        const ultimoDiaDoMes = new Date(dataParcela.getFullYear(), dataParcela.getMonth() + 1, 0).getDate();
        const diaFinal = Math.min(diaPagamento, ultimoDiaDoMes);
        dataParcela.setDate(diaFinal);
        
        // Marcar as primeiras parcelas como pagas se informado
        const paga = i < parcelasPagas;
        
        parcelasDetalhes.push({
            numero: i + 1,
            data: dataParcela.toISOString().split('T')[0],
            valor: valorParcela,
            paga: paga
        });
    }

    // Calcular data final baseada no dia de pagamento
    const dataFinal = new Date(dataInicioObj);
    dataFinal.setMonth(dataFinal.getMonth() + parcelas - 1);
    const ultimoDiaDoMesFinal = new Date(dataFinal.getFullYear(), dataFinal.getMonth() + 1, 0).getDate();
    const diaFinal = Math.min(diaPagamento, ultimoDiaDoMesFinal);
    dataFinal.setDate(diaFinal);

    const novaFatura = {
        id: Date.now(),
        cartao,
        banco,
        valorTotal,
        parcelas,
        parcelasPagas: parcelasPagas,
        parcelasRestantes: parcelas - parcelasPagas,
        valorParcela,
        dataInicio,
        diaPagamento: diaPagamento,
        dataFinal: dataFinal.toISOString().split('T')[0],
        taxaJuros,
        descricao: descricao || "",
        parcelasDetalhes,
        ativa: true,
        dataCriacao: new Date().toISOString()
    };

    faturasParceladas.push(novaFatura);
    salvarFaturasLocal();
    
    // Gerar transações automáticas para as parcelas não pagas
    gerarTransacoesFaturasParceladas();
    
    atualizarTabelaFaturas();
    updateUI(currentMonth, currentYear);
    document.getElementById('faturaForm').reset();
    const hoje = new Date();
    document.getElementById('faturaDataInicio').valueAsDate = hoje;
    document.getElementById('faturaDiaPagamento').value = 10;
    document.getElementById('faturaParcelasPagas').value = 0;
    toggleFaturaForm();

    alert("Despesa cartão adicionada com sucesso!");
}

function calcularJurosAtraso(fatura, diasAtraso = 0) {
    if (diasAtraso <= 0) return 0;
    
    // Juros compostos: M = C * (1 + i)^n
    // Onde: C = valor da parcela, i = taxa mensal, n = meses de atraso
    const mesesAtraso = diasAtraso / 30;
    const juros = fatura.valorParcela * (Math.pow(1 + (fatura.taxaJuros / 100), mesesAtraso) - 1);
    
    // Multa de 2% sobre o valor da parcela
    const multa = fatura.valorParcela * 0.02;
    
    return juros + multa;
}

function calcularProximoValor(fatura) {
    const hoje = new Date();
    const proximaParcela = fatura.parcelasDetalhes.find(p => !p.paga);
    
    if (!proximaParcela) return { valor: 0, diasAtraso: 0, juros: 0 };

    // Calcular data de vencimento baseada no dia de pagamento do cartão
    let dataVencimento = new Date(proximaParcela.data);
    
    // Se a fatura tem dia de pagamento, calcular o próximo vencimento baseado nele
    if (fatura.diaPagamento) {
        const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDiaDoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();
        const diaFinal = Math.min(fatura.diaPagamento, ultimoDiaDoMes);
        
        // Se já passou o dia de pagamento deste mês, usar o próximo mês
        if (hoje.getDate() > fatura.diaPagamento) {
            mesAtual.setMonth(mesAtual.getMonth() + 1);
            const ultimoDiaProximoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();
            const diaFinalProximo = Math.min(fatura.diaPagamento, ultimoDiaProximoMes);
            dataVencimento = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), diaFinalProximo);
        } else {
            dataVencimento = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), diaFinal);
        }
    }
    
    const diasAtraso = Math.max(0, Math.floor((hoje - dataVencimento) / (1000 * 60 * 60 * 24)));
    
    const juros = calcularJurosAtraso(fatura, diasAtraso);
    const valorTotal = proximaParcela.valor + juros;

    return {
        valor: valorTotal,
        diasAtraso,
        juros,
        dataVencimento: dataVencimento.toISOString().split('T')[0],
        numeroParcela: proximaParcela.numero
    };
}

function calcularParcelasRestantes(fatura) {
    const parcelasPagas = fatura.parcelasDetalhes.filter(p => p.paga).length;
    fatura.parcelasPagas = parcelasPagas;
    fatura.parcelasRestantes = fatura.parcelas - parcelasPagas;
    return fatura.parcelasRestantes;
}

function atualizarTabelaFaturas() {
    const tbody = document.getElementById('faturasTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (faturasParceladas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-light);">
                    Nenhuma despesa cartão cadastrada.
                </td>
            </tr>
        `;
        return;
    }

    faturasParceladas.forEach(fatura => {
        // Atualizar parcelas restantes automaticamente
        calcularParcelasRestantes(fatura);
        
        const valorFormatado = fatura.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const parcelaFormatada = fatura.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataFinal = fatura.dataFinal ? new Date(fatura.dataFinal).toLocaleDateString('pt-BR') : '-';
        
        // Status da fatura (ativo/inativo)
        const statusFatura = fatura.ativa !== false ? 'Ativa' : 'Inativa';
        const statusFaturaClass = fatura.ativa !== false ? 'accent-green' : 'accent-red';
        
        tbody.innerHTML += `
            <tr style="opacity: ${fatura.ativa !== false ? '1' : '0.6'};">
                <td style="font-weight: 600;">${fatura.cartao}</td>
                <td>${fatura.banco}</td>
                <td style="font-weight: 600; color: var(--accent-red);">${valorFormatado}</td>
                <td>${fatura.parcelas}x</td>
                <td style="color: var(--accent-green); font-weight: 600;">${fatura.parcelasPagas}</td>
                <td><strong style="color: var(--accent-red);">${fatura.parcelasRestantes}</strong></td>
                <td>${parcelaFormatada}</td>
                <td>${dataFinal}</td>
                <td style="color: var(--${statusFaturaClass}); font-weight: 600;">${statusFatura}</td>
                <td>
                    <button onclick="abrirModalEditarFatura(${fatura.id})" class="btn-export" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 5px; margin-bottom: 5px;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="alternarStatusFatura(${fatura.id})" class="btn-export" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 5px; margin-bottom: 5px;">
                        <i class="fas fa-${fatura.ativa !== false ? 'pause' : 'play'}"></i> ${fatura.ativa !== false ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onclick="removerFatura(${fatura.id})" class="btn-clear" style="padding: 6px 12px; font-size: 0.85rem;">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </td>
            </tr>
        `;
    });
}

function atualizarFiltros() {
    const filtroCartao = document.getElementById('filtroCartao');
    const filtroBanco = document.getElementById('filtroBanco');

    if (!filtroCartao || !filtroBanco) return;

    // Obter valores únicos
    const cartoes = [...new Set(faturasParceladas.map(f => f.cartao))];
    const bancos = [...new Set(faturasParceladas.map(f => f.banco))];

    // Limpar e preencher filtro de cartões
    filtroCartao.innerHTML = '<option value="">Todos os cartões</option>';
    cartoes.forEach(cartao => {
        filtroCartao.innerHTML += `<option value="${cartao}">${cartao}</option>`;
    });

    // Limpar e preencher filtro de bancos
    filtroBanco.innerHTML = '<option value="">Todos os bancos</option>';
    bancos.forEach(banco => {
        filtroBanco.innerHTML += `<option value="${banco}">${banco}</option>`;
    });
}

function filtrarFaturas() {
    const filtroCartao = document.getElementById('filtroCartao').value;
    const filtroBanco = document.getElementById('filtroBanco').value;
    const filtroParcelas = document.getElementById('filtroParcelas').value;

    const linhas = document.querySelectorAll('#faturasTableBody tr[data-fatura-id]');
    
    linhas.forEach(linha => {
        const cartao = linha.getAttribute('data-cartao');
        const banco = linha.getAttribute('data-banco');
        const parcelas = parseInt(linha.getAttribute('data-parcelas'));

        let mostrar = true;

        if (filtroCartao && cartao !== filtroCartao) mostrar = false;
        if (filtroBanco && banco !== filtroBanco) mostrar = false;
        
        if (filtroParcelas) {
            if (filtroParcelas === '1-3' && (parcelas < 1 || parcelas > 3)) mostrar = false;
            else if (filtroParcelas === '4-6' && (parcelas < 4 || parcelas > 6)) mostrar = false;
            else if (filtroParcelas === '7-12' && (parcelas < 7 || parcelas > 12)) mostrar = false;
            else if (filtroParcelas === '13+' && parcelas < 13) mostrar = false;
        }

        linha.style.display = mostrar ? '' : 'none';
    });
}

function limparFiltros() {
    document.getElementById('filtroCartao').value = '';
    document.getElementById('filtroBanco').value = '';
    document.getElementById('filtroParcelas').value = '';
    filtrarFaturas();
}

function marcarParcelaPaga(faturaId) {
    const fatura = faturasParceladas.find(f => f.id === faturaId);
    if (!fatura) return;

    const proximaParcela = fatura.parcelasDetalhes.find(p => !p.paga);
    if (!proximaParcela) {
        alert("Todas as parcelas já foram pagas!");
        return;
    }

    if (!confirm(`Confirmar pagamento da parcela ${proximaParcela.numero}/${fatura.parcelas}?`)) return;

    proximaParcela.paga = true;
    calcularParcelasRestantes(fatura);

    // Remover transação da parcela paga e regenerar próximas
    const hoje = new Date();
    transactions = transactions.filter(t => {
        if (t.faturaId === faturaId && t.parcelaNumero === proximaParcela.numero) {
            return false;
        }
        return true;
    });
    
    gerarTransacoesFaturasParceladas();

    salvarFaturasLocal();
    salvarLocal();
    atualizarTabelaFaturas();
    updateUI(currentMonth, currentYear);
}

function abrirModalParcelas(faturaId) {
    const fatura = faturasParceladas.find(f => f.id === faturaId);
    if (!fatura) return;

    let modalHTML = `
        <div id="modalParcelas" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 20px; padding: 30px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: var(--primary-blue); margin: 0;">Parcelas - ${fatura.cartao} / ${fatura.banco}</h3>
                    <button onclick="fecharModalParcelas()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-medium);">&times;</button>
                </div>
                <p style="margin-bottom: 20px; color: var(--text-medium);">
                    <strong>Valor Total:</strong> ${fatura.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
                    <strong>Parcelas:</strong> ${fatura.parcelas}x | 
                    <strong>Valor da Parcela:</strong> ${fatura.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--bg-light);">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid var(--gray-border);">Parcela</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid var(--gray-border);">Vencimento</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid var(--gray-border);">Valor</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid var(--gray-border);">Status</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

    fatura.parcelasDetalhes.forEach(parcela => {
        const dataVenc = new Date(parcela.data).toLocaleDateString('pt-BR');
        const valorFormatado = parcela.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const status = parcela.paga ? 
            '<span style="color: var(--accent-green); font-weight: 600;">✓ Paga</span>' : 
            '<span style="color: var(--accent-red);">Pendente</span>';
        
        modalHTML += `
            <tr style="border-bottom: 1px solid var(--gray-border);">
                <td style="padding: 10px;">${parcela.numero}/${fatura.parcelas}</td>
                <td style="padding: 10px;">${dataVenc}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">${valorFormatado}</td>
                <td style="padding: 10px; text-align: center;">
                    ${status}
                    ${!parcela.paga ? `<button onclick="marcarParcelaEspecifica(${fatura.id}, ${parcela.numero})" class="btn-add" style="padding: 4px 8px; font-size: 0.75rem; margin-left: 10px;">
                        <i class="fas fa-check"></i> Marcar Paga
                    </button>` : ''}
                </td>
            </tr>
        `;
    });

    modalHTML += `
                        </tbody>
                    </table>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="fecharModalParcelas()" class="btn-clear">Fechar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function fecharModalParcelas() {
    const modal = document.getElementById('modalParcelas');
    if (modal) {
        modal.remove();
    }
}

function marcarParcelaEspecifica(faturaId, numeroParcela) {
    const fatura = faturasParceladas.find(f => f.id === faturaId);
    if (!fatura) return;

    const parcela = fatura.parcelasDetalhes.find(p => p.numero === numeroParcela);
    if (!parcela) return;

    if (parcela.paga) {
        alert("Esta parcela já foi marcada como paga!");
        return;
    }

    if (!confirm(`Confirmar pagamento da parcela ${numeroParcela}/${fatura.parcelas}?`)) return;

    parcela.paga = true;
    calcularParcelasRestantes(fatura);

    // Remover transação da parcela paga e regenerar próximas
    const hoje = new Date();
    transactions = transactions.filter(t => {
        if (t.faturaId === faturaId && t.parcelaNumero === numeroParcela) {
            return false;
        }
        return true;
    });
    
    gerarTransacoesFaturasParceladas();

    salvarFaturasLocal();
    salvarLocal();
    fecharModalParcelas();
    atualizarTabelaFaturas();
    updateUI(currentMonth, currentYear);
}

function abrirModalEditarFatura(faturaId) {
    const fatura = faturasParceladas.find(f => f.id === faturaId);
    if (!fatura) return;

    const dataInicio = new Date(fatura.dataInicio).toISOString().split('T')[0];

    let modalHTML = `
        <div id="modalEditarFatura" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 20px; padding: 30px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: var(--primary-blue); margin: 0;">Editar Despesa Cartão</h3>
                    <button onclick="fecharModalEditarFatura()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-medium);">&times;</button>
                </div>
                <form id="formEditarFatura" onsubmit="salvarEdicaoFatura(event, ${faturaId})">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Cartão</label>
                            <input type="text" id="editFaturaCartao" value="${fatura.cartao}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Banco</label>
                            <input type="text" id="editFaturaBanco" value="${fatura.banco}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Valor Total (R$)</label>
                            <input type="number" id="editFaturaValorTotal" step="0.01" value="${fatura.valorTotal}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Número de Parcelas</label>
                            <input type="number" id="editFaturaParcelas" min="1" max="60" value="${fatura.parcelas}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Data da Primeira Parcela</label>
                            <input type="date" id="editFaturaDataInicio" value="${dataInicio}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Dia de Pagamento do Cartão</label>
                            <input type="number" id="editFaturaDiaPagamento" min="1" max="31" value="${fatura.diaPagamento}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Taxa de Juros (% ao mês)</label>
                            <input type="number" id="editFaturaTaxaJuros" step="0.01" value="${fatura.taxaJuros}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Descrição</label>
                            <input type="text" id="editFaturaDescricao" value="${fatura.descricao || ''}" style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                    </div>
                    <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-bottom: 20px;">
                        ⚠️ Atenção: Ao editar, as parcelas serão recalculadas. Parcelas já pagas serão mantidas.
                    </small>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="fecharModalEditarFatura()" class="btn-clear">Cancelar</button>
                        <button type="submit" class="btn-add">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function fecharModalEditarFatura() {
    const modal = document.getElementById('modalEditarFatura');
    if (modal) {
        modal.remove();
    }
}

function salvarEdicaoFatura(e, faturaId) {
    e.preventDefault();

    const fatura = faturasParceladas.find(f => f.id === faturaId);
    if (!fatura) return;

    const novoCartao = document.getElementById('editFaturaCartao').value.trim();
    const novoBanco = document.getElementById('editFaturaBanco').value.trim();
    const novoValorTotal = parseFloat(document.getElementById('editFaturaValorTotal').value);
    const novasParcelas = parseInt(document.getElementById('editFaturaParcelas').value);
    const novaDataInicio = document.getElementById('editFaturaDataInicio').value;
    const novoDiaPagamento = parseInt(document.getElementById('editFaturaDiaPagamento').value);
    const novaTaxaJuros = parseFloat(document.getElementById('editFaturaTaxaJuros').value);
    const novaDescricao = document.getElementById('editFaturaDescricao').value.trim();

    if (!novoCartao || !novoBanco || isNaN(novoValorTotal) || novoValorTotal <= 0 || !novasParcelas || novasParcelas <= 0 || !novaDataInicio || !novoDiaPagamento || novoDiaPagamento < 1 || novoDiaPagamento > 31) {
        alert("Preencha todos os campos obrigatórios corretamente!");
        return;
    }

    // Manter o número de parcelas pagas (não pode ser maior que o total)
    const parcelasPagas = Math.min(fatura.parcelasPagas, novasParcelas);

    // Remover transações futuras relacionadas para regenerar com novos dados
    const hoje = new Date();
    transactions = transactions.filter(t => {
        if (t.faturaId === faturaId) {
            const dataTransacao = new Date(t.date);
            return dataTransacao < hoje;
        }
        return true;
    });

    // Recalcular valor da parcela
    const novoValorParcela = novoValorTotal / novasParcelas;
    const dataInicioObj = new Date(novaDataInicio);
    
    // Recalcular datas das parcelas baseadas no dia de pagamento
    const parcelasDetalhes = [];
    for (let i = 0; i < novasParcelas; i++) {
        // Calcular data da parcela baseada no dia de pagamento
        const dataParcela = new Date(dataInicioObj);
        dataParcela.setMonth(dataParcela.getMonth() + i);
        
        // Ajustar para o dia de pagamento do cartão
        const ultimoDiaDoMes = new Date(dataParcela.getFullYear(), dataParcela.getMonth() + 1, 0).getDate();
        const diaFinal = Math.min(novoDiaPagamento, ultimoDiaDoMes);
        dataParcela.setDate(diaFinal);
        
        // Manter status de pagamento das parcelas antigas (se existirem)
        let paga = false;
        if (i < fatura.parcelasDetalhes.length) {
            paga = fatura.parcelasDetalhes[i].paga;
        } else if (i < parcelasPagas) {
            paga = true;
        }
        
        parcelasDetalhes.push({
            numero: i + 1,
            data: dataParcela.toISOString().split('T')[0],
            valor: novoValorParcela,
            paga: paga
        });
    }

    // Calcular data final baseada no dia de pagamento
    const dataFinal = new Date(dataInicioObj);
    dataFinal.setMonth(dataFinal.getMonth() + novasParcelas - 1);
    const ultimoDiaDoMesFinal = new Date(dataFinal.getFullYear(), dataFinal.getMonth() + 1, 0).getDate();
    const diaFinal = Math.min(novoDiaPagamento, ultimoDiaDoMesFinal);
    dataFinal.setDate(diaFinal);

    // Atualizar dados da fatura
    fatura.cartao = novoCartao;
    fatura.banco = novoBanco;
    fatura.valorTotal = novoValorTotal;
    fatura.parcelas = novasParcelas;
    fatura.parcelasPagas = parcelasPagas;
    fatura.parcelasRestantes = novasParcelas - parcelasPagas;
    fatura.valorParcela = novoValorParcela;
    fatura.dataInicio = novaDataInicio;
    fatura.diaPagamento = novoDiaPagamento;
    fatura.dataFinal = dataFinal.toISOString().split('T')[0];
    fatura.taxaJuros = novaTaxaJuros;
    fatura.descricao = novaDescricao || "";
    fatura.parcelasDetalhes = parcelasDetalhes;

    salvarFaturasLocal();
    
    // Regenerar transações com os novos dados
    if (fatura.ativa !== false) {
        gerarTransacoesFaturasParceladas();
    }
    
    salvarLocal();
    fecharModalEditarFatura();
    atualizarTabelaFaturas();
    updateUI(currentMonth, currentYear);

    alert("Despesa cartão atualizada com sucesso!");
}

function alternarStatusFatura(faturaId) {
    const fatura = faturasParceladas.find(f => f.id === faturaId);
    if (!fatura) return;

    fatura.ativa = fatura.ativa === false ? true : false;
    
    // Se estiver desativando, remover transações futuras
    if (!fatura.ativa) {
        const hoje = new Date();
        transactions = transactions.filter(t => {
            if (t.faturaId === faturaId) {
                const dataTransacao = new Date(t.date);
                return dataTransacao < hoje;
            }
            return true;
        });
        salvarLocal();
    } else {
        // Se estiver ativando, gerar transações futuras
        gerarTransacoesFaturasParceladas();
    }
    
    salvarFaturasLocal();
    atualizarTabelaFaturas();
    updateUI(currentMonth, currentYear);
}

function removerFatura(faturaId) {
    if (!confirm("Deseja remover esta despesa cartão?")) return;

    // Remover todas as transações relacionadas a esta fatura
    transactions = transactions.filter(t => t.faturaId !== faturaId);
    
    // Remover a fatura
    faturasParceladas = faturasParceladas.filter(f => f.id !== faturaId);
    
    // Salvar alterações
    salvarFaturasLocal();
    salvarLocal();
    
    // Atualizar interface
    atualizarTabelaFaturas();
    updateUI(currentMonth, currentYear);
}

// ===============================
//  DESPESAS RECORRENTES
// ===============================

function salvarDespesasRecorrentesLocal() {
    // Somente persiste se houver usuário logado
    if (isLoggedIn && currentUser) {
        localStorage.setItem("despesasRecorrentes", JSON.stringify(despesasRecorrentes));
        atualizarBackupUsuarioLocal();
    } else {
        localStorage.removeItem("despesasRecorrentes");
    }
}

function toggleDespesaRecorrenteForm() {
    const container = document.getElementById('despesaRecorrenteFormContainer');
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
        if (container.style.display === 'block') {
            const hoje = new Date();
            document.getElementById('despesaRecorrenteInicio').valueAsDate = hoje;
        }
    }
}

function adicionarDespesaRecorrente(e) {
    e.preventDefault();

    const descricao = document.getElementById('despesaRecorrenteDescricao').value.trim();
    const valor = parseFloat(document.getElementById('despesaRecorrenteValor').value);
    const dia = parseInt(document.getElementById('despesaRecorrenteDia').value);
    const inicio = document.getElementById('despesaRecorrenteInicio').value;
    const termino = document.getElementById('despesaRecorrenteTermino').value;
    const obs = document.getElementById('despesaRecorrenteObs').value.trim();

    if (!descricao || isNaN(valor) || valor <= 0 || !dia || dia < 1 || dia > 31 || !inicio) {
        alert("Preencha todos os campos obrigatórios corretamente!");
        return;
    }

    const novaDespesaRecorrente = {
        id: Date.now(),
        descricao,
        categoria: descricao, // Usar descrição como categoria
        valor,
        dia,
        inicio,
        termino: termino || null,
        obs: obs || "",
        ativa: true,
        dataCriacao: new Date().toISOString()
    };

    despesasRecorrentes.push(novaDespesaRecorrente);
    salvarDespesasRecorrentesLocal();
    
    // Gerar transações para meses futuros
    gerarTransacoesRecorrentes();
    
    atualizarTabelaDespesasRecorrentes();
    updateUI(currentMonth, currentYear);
    document.getElementById('despesaRecorrenteForm').reset();
    toggleDespesaRecorrenteForm();

    alert("Despesa recorrente adicionada com sucesso!");
}

function gerarTransacoesRecorrentes() {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    // Gerar transações para os próximos 12 meses
    for (let mesesAdicionar = 0; mesesAdicionar < 12; mesesAdicionar++) {
        const dataAlvo = new Date(anoAtual, mesAtual + mesesAdicionar, 1);
        const anoAlvo = dataAlvo.getFullYear();
        const mesAlvo = dataAlvo.getMonth();
        
        despesasRecorrentes.forEach(despesa => {
            if (!despesa.ativa) return;
            
            const dataInicio = new Date(despesa.inicio);
            const dataTermino = despesa.termino ? new Date(despesa.termino) : null;
            
            // Verificar se a despesa já começou
            if (anoAlvo < dataInicio.getFullYear() || 
                (anoAlvo === dataInicio.getFullYear() && mesAlvo < dataInicio.getMonth())) {
                return;
            }
            
            // Verificar se a despesa já terminou
            if (dataTermino) {
                if (anoAlvo > dataTermino.getFullYear() || 
                    (anoAlvo === dataTermino.getFullYear() && mesAlvo > dataTermino.getMonth())) {
                    return;
                }
            }
            
            // Criar data da transação
            const diaTransacao = Math.min(despesa.dia, new Date(anoAlvo, mesAlvo + 1, 0).getDate());
            const dataTransacao = new Date(anoAlvo, mesAlvo, diaTransacao);
            const dataTransacaoStr = dataTransacao.toISOString().split('T')[0];
            
            // Verificar se já existe uma transação para esta despesa neste mês
            const transacaoExistente = transactions.find(t => 
                t.recorrenteId === despesa.id && 
                t.date === dataTransacaoStr
            );
            
            if (!transacaoExistente) {
                const novaTransacao = {
                    id: Date.now() + Math.random(),
                    date: dataTransacaoStr,
                    type: "Despesa",
                    category: despesa.categoria,
                    amount: despesa.valor,
                    obs: despesa.obs || `[Recorrente] ${despesa.descricao}`,
                    recorrenteId: despesa.id
                };
                
                transactions.push(novaTransacao);
            }
        });
    }
    
    salvarLocal();
}

// ===============================
//  ATUALIZAR TOTAIS RECORRENTES NO HEADER
// ===============================
function atualizarTotaisRecorrentes(filterMonth = null, filterYear = null) {
    const hoje = new Date();
    const mesAtual = filterMonth !== null ? filterMonth : hoje.getMonth();
    const anoAtual = filterYear !== null ? filterYear : hoje.getFullYear();

    // Calcular total de despesas recorrentes para o mês
    let totalDespesasRecorrentes = 0;
    despesasRecorrentes.forEach(despesa => {
        if (!despesa.ativa) return;

        const dataInicio = new Date(despesa.inicio);
        const dataTermino = despesa.termino ? new Date(despesa.termino) : null;

        // Verificar se a despesa se aplica ao mês atual
        if (anoAtual < dataInicio.getFullYear() || 
            (anoAtual === dataInicio.getFullYear() && mesAtual < dataInicio.getMonth())) {
            return;
        }

        if (dataTermino) {
            if (anoAtual > dataTermino.getFullYear() || 
                (anoAtual === dataTermino.getFullYear() && mesAtual > dataTermino.getMonth())) {
                return;
            }
        }

        totalDespesasRecorrentes += despesa.valor;
    });

    // Calcular total de despesas cartões (parcelas pendentes) para o mês
    let totalFaturasRecorrentes = 0;
    faturasParceladas.forEach(fatura => {
        fatura.parcelasDetalhes.forEach(parcela => {
            if (parcela.paga) return;

            const dataParcela = new Date(parcela.data);
            if (dataParcela.getMonth() === mesAtual && dataParcela.getFullYear() === anoAtual) {
                totalFaturasRecorrentes += parcela.valor;
            }
        });
    });

    // Atualizar elementos no header
    const totalDespesasRecorrentesEl = document.getElementById('totalDespesasRecorrentes');
    const totalFaturasRecorrentesEl = document.getElementById('totalFaturasRecorrentes');

    if (totalDespesasRecorrentesEl) {
        totalDespesasRecorrentesEl.innerText = totalDespesasRecorrentes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    if (totalFaturasRecorrentesEl) {
        totalFaturasRecorrentesEl.innerText = totalFaturasRecorrentes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
}

// ===============================
//  GERAR TRANSAÇÕES DE DESPESAS CARTÕES
// ===============================
function gerarTransacoesFaturasParceladas() {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    // Gerar transações para os próximos 12 meses
    for (let mesesAdicionar = 0; mesesAdicionar < 12; mesesAdicionar++) {
        const dataAlvo = new Date(anoAtual, mesAtual + mesesAdicionar, 1);
        const anoAlvo = dataAlvo.getFullYear();
        const mesAlvo = dataAlvo.getMonth();
        
        faturasParceladas.forEach(fatura => {
            // Processar apenas faturas ativas
            if (fatura.ativa === false) return;
            
            // Processar apenas parcelas não pagas
            fatura.parcelasDetalhes.forEach(parcela => {
                if (parcela.paga) return;
                
                const dataParcela = new Date(parcela.data);
                const anoParcela = dataParcela.getFullYear();
                const mesParcela = dataParcela.getMonth();
                
                // Verificar se a parcela está no mês alvo
                if (anoParcela !== anoAlvo || mesParcela !== mesAlvo) {
                    return;
                }
                
                // Verificar se já existe uma transação para esta parcela
                const transacaoExistente = transactions.find(t => 
                    t.faturaId === fatura.id && 
                    t.parcelaNumero === parcela.numero
                );
                
                if (!transacaoExistente) {
                    const novaTransacao = {
                        id: Date.now() + Math.random(),
                        date: parcela.data,
                        type: "Despesa",
                        category: `Fatura ${fatura.cartao} - ${fatura.banco}`,
                        amount: parcela.valor,
                        obs: `[Despesa Cartão] ${fatura.descricao || `${fatura.cartao} / ${fatura.banco}`} - Parcela ${parcela.numero}/${fatura.parcelas}`,
                        faturaId: fatura.id,
                        parcelaNumero: parcela.numero
                    };
                    
                    transactions.push(novaTransacao);
                }
            });
        });
    }
    
    salvarLocal();
}

function atualizarTabelaDespesasRecorrentes() {
    const tbody = document.getElementById('despesasRecorrentesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (despesasRecorrentes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-light);">
                    Nenhuma despesa recorrente cadastrada.
                </td>
            </tr>
        `;
        return;
    }

    despesasRecorrentes.forEach(despesa => {
        const valorFormatado = despesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataInicio = new Date(despesa.inicio).toLocaleDateString('pt-BR');
        const dataTermino = despesa.termino ? new Date(despesa.termino).toLocaleDateString('pt-BR') : 'Permanente';
        
        const hoje = new Date();
        const dataTerminoObj = despesa.termino ? new Date(despesa.termino) : null;
        let status = despesa.ativa ? 'Ativa' : 'Inativa';
        let statusClass = despesa.ativa ? 'accent-green' : 'accent-red';
        
        if (despesa.ativa && dataTerminoObj && hoje > dataTerminoObj) {
            status = 'Encerrada';
            statusClass = 'accent-red';
        }

        tbody.innerHTML += `
            <tr style="opacity: ${despesa.ativa ? '1' : '0.6'};">
                <td style="font-weight: 600;">${despesa.descricao}</td>
                <td style="font-weight: 600; color: var(--accent-red);">${valorFormatado}</td>
                <td>Dia ${despesa.dia}</td>
                <td>${dataInicio}</td>
                <td>${dataTermino}</td>
                <td style="color: var(--${statusClass}); font-weight: 600;">${status}</td>
                <td>
                    <button onclick="abrirModalEditarDespesaRecorrente(${despesa.id})" class="btn-export" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 5px; margin-bottom: 5px;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="alternarStatusDespesaRecorrente(${despesa.id})" class="btn-export" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 5px; margin-bottom: 5px;">
                        <i class="fas fa-${despesa.ativa ? 'pause' : 'play'}"></i> ${despesa.ativa ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onclick="removerDespesaRecorrente(${despesa.id})" class="btn-clear" style="padding: 6px 12px; font-size: 0.85rem;">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </td>
            </tr>
        `;
    });
}

function abrirModalEditarDespesaRecorrente(despesaId) {
    const despesa = despesasRecorrentes.find(d => d.id === despesaId);
    if (!despesa) return;

    const dataInicio = new Date(despesa.inicio).toISOString().split('T')[0];
    const dataTermino = despesa.termino ? new Date(despesa.termino).toISOString().split('T')[0] : '';

    let modalHTML = `
        <div id="modalEditarDespesaRecorrente" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 20px; padding: 30px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: var(--primary-blue); margin: 0;">Editar Despesa Recorrente</h3>
                    <button onclick="fecharModalEditarDespesaRecorrente()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-medium);">&times;</button>
                </div>
                <form id="formEditarDespesaRecorrente" onsubmit="salvarEdicaoDespesaRecorrente(event, ${despesaId})">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Categoria</label>
                            <input type="text" id="editCategoria" value="${despesa.categoria}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Valor Mensal (R$)</label>
                            <input type="number" id="editValor" step="0.01" value="${despesa.valor}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Dia do Mês</label>
                        <input type="number" id="editDia" min="1" max="31" value="${despesa.dia}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Data de Início</label>
                            <input type="date" id="editInicio" value="${dataInicio}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Data de Término (Opcional)</label>
                            <input type="date" id="editTermino" value="${dataTermino}" style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                    </div>
                    <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-bottom: 20px;">
                        Deixe a data de término em branco para despesa permanente
                    </small>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="fecharModalEditarDespesaRecorrente()" class="btn-clear">Cancelar</button>
                        <button type="submit" class="btn-add">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function fecharModalEditarDespesaRecorrente() {
    const modal = document.getElementById('modalEditarDespesaRecorrente');
    if (modal) {
        modal.remove();
    }
}

function salvarEdicaoDespesaRecorrente(e, despesaId) {
    e.preventDefault();

    const despesa = despesasRecorrentes.find(d => d.id === despesaId);
    if (!despesa) return;

    const novaCategoria = document.getElementById('editCategoria').value.trim();
    const novoValor = parseFloat(document.getElementById('editValor').value);
    const novoDia = parseInt(document.getElementById('editDia').value);
    const novoInicio = document.getElementById('editInicio').value;
    const novoTermino = document.getElementById('editTermino').value;

    if (!novaCategoria || isNaN(novoValor) || novoValor <= 0 || !novoDia || novoDia < 1 || novoDia > 31 || !novoInicio) {
        alert("Preencha todos os campos corretamente!");
        return;
    }

    // Remover transações futuras relacionadas para regenerar com novos dados
    const hoje = new Date();
    transactions = transactions.filter(t => {
        if (t.recorrenteId === despesaId) {
            const dataTransacao = new Date(t.date);
            return dataTransacao < hoje;
        }
        return true;
    });

    // Atualizar dados da despesa
    despesa.categoria = novaCategoria;
    despesa.descricao = novaCategoria; // Manter para compatibilidade
    despesa.valor = novoValor;
    despesa.dia = novoDia;
    despesa.inicio = novoInicio;
    despesa.termino = novoTermino || null;

    salvarDespesasRecorrentesLocal();
    
    // Regenerar transações com os novos dados
    if (despesa.ativa) {
        gerarTransacoesRecorrentes();
    }
    
    salvarLocal();
    fecharModalEditarDespesaRecorrente();
    atualizarTabelaDespesasRecorrentes();
    updateUI(currentMonth, currentYear);

    alert("Despesa recorrente atualizada com sucesso!");
}

function alternarStatusDespesaRecorrente(despesaId) {
    const despesa = despesasRecorrentes.find(d => d.id === despesaId);
    if (!despesa) return;

    despesa.ativa = !despesa.ativa;
    
    // Se estiver desativando, remover transações futuras
    if (!despesa.ativa) {
        const hoje = new Date();
        transactions = transactions.filter(t => {
            if (t.recorrenteId === despesaId) {
                const dataTransacao = new Date(t.date);
                return dataTransacao < hoje;
            }
            return true;
        });
        salvarLocal();
    }
    
    salvarDespesasRecorrentesLocal();
    
    // Se estiver ativando, gerar transações novamente
    if (despesa.ativa) {
        gerarTransacoesRecorrentes();
    }
    
    atualizarTabelaDespesasRecorrentes();
    updateUI(currentMonth, currentYear);
}

function removerDespesaRecorrente(despesaId) {
    if (!confirm("Deseja remover esta despesa recorrente? Todas as transações relacionadas serão removidas.")) return;

    // Remover todas as transações relacionadas a esta despesa recorrente
    transactions = transactions.filter(t => t.recorrenteId !== despesaId);
    
    // Remover a despesa recorrente
    despesasRecorrentes = despesasRecorrentes.filter(d => d.id !== despesaId);
    
    // Salvar alterações
    salvarDespesasRecorrentesLocal();
    salvarLocal();
    
    // Atualizar interface
    atualizarTabelaDespesasRecorrentes();
    updateUI(currentMonth, currentYear);
}

// ===============================
//  RECEITAS RECORRENTES
// ===============================

function salvarReceitasRecorrentesLocal() {
    // Somente persiste se houver usuário logado
    if (isLoggedIn && currentUser) {
        localStorage.setItem("receitasRecorrentes", JSON.stringify(receitasRecorrentes));
        atualizarBackupUsuarioLocal();
    } else {
        localStorage.removeItem("receitasRecorrentes");
    }
}

function toggleReceitaRecorrenteForm() {
    const container = document.getElementById('receitaRecorrenteFormContainer');
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
        if (container.style.display === 'block') {
            const hoje = new Date();
            document.getElementById('receitaRecorrenteInicio').valueAsDate = hoje;
        }
    }
}

function adicionarReceitaRecorrente(e) {
    e.preventDefault();

    const descricao = document.getElementById('receitaRecorrenteDescricao').value.trim();
    const valor = parseFloat(document.getElementById('receitaRecorrenteValor').value);
    const dia = parseInt(document.getElementById('receitaRecorrenteDia').value);
    const inicio = document.getElementById('receitaRecorrenteInicio').value;
    const termino = document.getElementById('receitaRecorrenteTermino').value;
    const obs = document.getElementById('receitaRecorrenteObs').value.trim();

    if (!descricao || isNaN(valor) || valor <= 0 || !dia || dia < 1 || dia > 31 || !inicio) {
        alert("Preencha todos os campos obrigatórios corretamente!");
        return;
    }

    const novaReceitaRecorrente = {
        id: Date.now(),
        descricao,
        categoria: descricao, // Usar descrição como categoria
        valor,
        dia,
        inicio,
        termino: termino || null,
        obs: obs || "",
        ativa: true,
        dataCriacao: new Date().toISOString()
    };

    receitasRecorrentes.push(novaReceitaRecorrente);
    salvarReceitasRecorrentesLocal();
    
    // Gerar transações automáticas
    gerarTransacoesReceitasRecorrentes();
    
    atualizarTabelaReceitasRecorrentes();
    updateUI(currentMonth, currentYear);
    document.getElementById('receitaRecorrenteForm').reset();
    const hoje = new Date();
    document.getElementById('receitaRecorrenteInicio').valueAsDate = hoje;
    toggleReceitaRecorrenteForm();

    alert("Receita recorrente adicionada com sucesso!");
}

function gerarTransacoesReceitasRecorrentes() {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    // Gerar transações para os próximos 12 meses
    for (let mesesAdicionar = 0; mesesAdicionar < 12; mesesAdicionar++) {
        const dataAlvo = new Date(anoAtual, mesAtual + mesesAdicionar, 1);
        const anoAlvo = dataAlvo.getFullYear();
        const mesAlvo = dataAlvo.getMonth();
        
        receitasRecorrentes.forEach(receita => {
            // Processar apenas receitas ativas
            if (!receita.ativa) return;
            
            const dataInicio = new Date(receita.inicio);
            const dataTermino = receita.termino ? new Date(receita.termino) : null;

            // Verificar se a receita se aplica ao mês atual
            if (anoAlvo < dataInicio.getFullYear() || 
                (anoAlvo === dataInicio.getFullYear() && mesAlvo < dataInicio.getMonth())) {
                return;
            }

            // Verificar se a receita já terminou
            if (dataTermino) {
                if (anoAlvo > dataTermino.getFullYear() || 
                    (anoAlvo === dataTermino.getFullYear() && mesAlvo > dataTermino.getMonth())) {
                    return;
                }
            }
            
            // Criar data da transação
            const diaTransacao = Math.min(receita.dia, new Date(anoAlvo, mesAlvo + 1, 0).getDate());
            const dataTransacao = new Date(anoAlvo, mesAlvo, diaTransacao);
            const dataTransacaoStr = dataTransacao.toISOString().split('T')[0];
            
            // Verificar se já existe uma transação para esta receita neste mês
            const transacaoExistente = transactions.find(t => 
                t.receitaRecorrenteId === receita.id && 
                t.date === dataTransacaoStr
            );
            
            if (!transacaoExistente) {
                const novaTransacao = {
                    id: Date.now() + Math.random(),
                    date: dataTransacaoStr,
                    type: "Receita",
                    category: receita.descricao,
                    amount: receita.valor,
                    obs: receita.obs || `[Recorrente] ${receita.descricao}`,
                    receitaRecorrenteId: receita.id
                };
                
                transactions.push(novaTransacao);
            }
        });
    }
    
    salvarLocal();
}

function atualizarTabelaReceitasRecorrentes() {
    const tbody = document.getElementById('receitasRecorrentesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (receitasRecorrentes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-light);">
                    Nenhuma receita recorrente cadastrada.
                </td>
            </tr>
        `;
        return;
    }

    receitasRecorrentes.forEach(receita => {
        const valorFormatado = receita.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataInicio = new Date(receita.inicio).toLocaleDateString('pt-BR');
        const dataTermino = receita.termino ? new Date(receita.termino).toLocaleDateString('pt-BR') : 'Permanente';
        
        const hoje = new Date();
        const dataTerminoObj = receita.termino ? new Date(receita.termino) : null;
        let status = receita.ativa ? 'Ativa' : 'Inativa';
        let statusClass = receita.ativa ? 'accent-green' : 'accent-red';
        
        if (receita.ativa && dataTerminoObj && hoje > dataTerminoObj) {
            status = 'Encerrada';
            statusClass = 'accent-red';
        }

        tbody.innerHTML += `
            <tr style="opacity: ${receita.ativa ? '1' : '0.6'};">
                <td style="font-weight: 600;">${receita.descricao}</td>
                <td style="font-weight: 600; color: var(--accent-green);">${valorFormatado}</td>
                <td>Dia ${receita.dia}</td>
                <td>${dataInicio}</td>
                <td>${dataTermino}</td>
                <td style="color: var(--${statusClass}); font-weight: 600;">${status}</td>
                <td>
                    <button onclick="abrirModalEditarReceitaRecorrente(${receita.id})" class="btn-export" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 5px; margin-bottom: 5px;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="alternarStatusReceitaRecorrente(${receita.id})" class="btn-export" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 5px; margin-bottom: 5px;">
                        <i class="fas fa-${receita.ativa ? 'pause' : 'play'}"></i> ${receita.ativa ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onclick="removerReceitaRecorrente(${receita.id})" class="btn-clear" style="padding: 6px 12px; font-size: 0.85rem;">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </td>
            </tr>
        `;
    });
}

function alternarStatusReceitaRecorrente(receitaId) {
    const receita = receitasRecorrentes.find(r => r.id === receitaId);
    if (!receita) return;

    receita.ativa = !receita.ativa;
    
    // Se estiver desativando, remover transações futuras
    if (!receita.ativa) {
        const hoje = new Date();
        transactions = transactions.filter(t => {
            if (t.receitaRecorrenteId === receitaId) {
                const dataTransacao = new Date(t.date);
                return dataTransacao < hoje;
            }
            return true;
        });
        salvarLocal();
    } else {
        // Se estiver ativando, gerar transações futuras
        gerarTransacoesReceitasRecorrentes();
    }
    
    salvarReceitasRecorrentesLocal();
    atualizarTabelaReceitasRecorrentes();
    updateUI(currentMonth, currentYear);
}

function removerReceitaRecorrente(receitaId) {
    if (!confirm("Deseja remover esta receita recorrente? Todas as transações relacionadas serão removidas.")) return;

    // Remover todas as transações relacionadas a esta receita recorrente
    transactions = transactions.filter(t => t.receitaRecorrenteId !== receitaId);
    
    // Remover a receita recorrente
    receitasRecorrentes = receitasRecorrentes.filter(r => r.id !== receitaId);
    
    // Salvar alterações
    salvarReceitasRecorrentesLocal();
    salvarLocal();
    
    // Atualizar interface
    atualizarTabelaReceitasRecorrentes();
    updateUI(currentMonth, currentYear);
}

function abrirModalEditarReceitaRecorrente(receitaId) {
    const receita = receitasRecorrentes.find(r => r.id === receitaId);
    if (!receita) return;

    const dataInicio = new Date(receita.inicio).toISOString().split('T')[0];
    const dataTermino = receita.termino ? new Date(receita.termino).toISOString().split('T')[0] : '';

    let modalHTML = `
        <div id="modalEditarReceitaRecorrente" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 20px; padding: 30px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: var(--primary-blue); margin: 0;">Editar Receita Recorrente</h3>
                    <button onclick="fecharModalEditarReceitaRecorrente()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-medium);">&times;</button>
                </div>
                <form id="formEditarReceitaRecorrente" onsubmit="salvarEdicaoReceitaRecorrente(event, ${receitaId})">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Descrição</label>
                            <input type="text" id="editReceitaDescricao" value="${receita.descricao}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Valor Mensal (R$)</label>
                            <input type="number" id="editReceitaValor" step="0.01" value="${receita.valor}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Dia do Mês</label>
                        <input type="number" id="editReceitaDia" min="1" max="31" value="${receita.dia}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Data de Início</label>
                            <input type="date" id="editReceitaInicio" value="${dataInicio}" required style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-dark); font-weight: 500;">Data de Término (Opcional)</label>
                            <input type="date" id="editReceitaTermino" value="${dataTermino}" style="width: 100%; padding: 14px 18px; border: 2px solid var(--gray-border); border-radius: 12px; font-size: 0.95rem;">
                        </div>
                    </div>
                    <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-bottom: 20px;">
                        Deixe a data de término em branco para receita permanente
                    </small>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="fecharModalEditarReceitaRecorrente()" class="btn-clear">Cancelar</button>
                        <button type="submit" class="btn-add">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function fecharModalEditarReceitaRecorrente() {
    const modal = document.getElementById('modalEditarReceitaRecorrente');
    if (modal) {
        modal.remove();
    }
}

function salvarEdicaoReceitaRecorrente(e, receitaId) {
    e.preventDefault();

    const receita = receitasRecorrentes.find(r => r.id === receitaId);
    if (!receita) return;

    const novaDescricao = document.getElementById('editReceitaDescricao').value.trim();
    const novoValor = parseFloat(document.getElementById('editReceitaValor').value);
    const novoDia = parseInt(document.getElementById('editReceitaDia').value);
    const novoInicio = document.getElementById('editReceitaInicio').value;
    const novoTermino = document.getElementById('editReceitaTermino').value;

    if (!novaDescricao || isNaN(novoValor) || novoValor <= 0 || !novoDia || novoDia < 1 || novoDia > 31 || !novoInicio) {
        alert("Preencha todos os campos corretamente!");
        return;
    }

    // Remover transações futuras relacionadas para regenerar com novos dados
    const hoje = new Date();
    transactions = transactions.filter(t => {
        if (t.receitaRecorrenteId === receitaId) {
            const dataTransacao = new Date(t.date);
            return dataTransacao < hoje;
        }
        return true;
    });

    // Atualizar dados da receita
    receita.descricao = novaDescricao;
    receita.categoria = novaDescricao; // Manter para compatibilidade
    receita.valor = novoValor;
    receita.dia = novoDia;
    receita.inicio = novoInicio;
    receita.termino = novoTermino || null;

    salvarReceitasRecorrentesLocal();
    
    // Regenerar transações com os novos dados
    if (receita.ativa) {
        gerarTransacoesReceitasRecorrentes();
    }
    
    salvarLocal();
    fecharModalEditarReceitaRecorrente();
    atualizarTabelaReceitasRecorrentes();
    updateUI(currentMonth, currentYear);

    alert("Receita recorrente atualizada com sucesso!");
}

// ===============================
//  MODO ESCURO
// ===============================
function toggleDarkMode() {
    const body = document.body;
    const darkModeIcon = document.getElementById('darkModeIcon');
    
    // Alternar classe dark-mode
    body.classList.toggle('dark-mode');
    
    // Verificar se o modo escuro está ativo
    const isDarkMode = body.classList.contains('dark-mode');
    
    // Atualizar ícone
    if (isDarkMode) {
        darkModeIcon.classList.remove('fa-moon');
        darkModeIcon.classList.add('fa-sun');
    } else {
        darkModeIcon.classList.remove('fa-sun');
        darkModeIcon.classList.add('fa-moon');
    }
    
    // Salvar preferência no localStorage
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    
    // Atualizar gráficos se necessário (Chart.js pode precisar de atualização)
    if (lineChart && pieChart) {
        setTimeout(() => {
            lineChart.resize();
            pieChart.resize();
        }, 100);
    }
}

function carregarModoEscuro() {
    const darkModePreference = localStorage.getItem('darkMode');
    const body = document.body;
    const darkModeIcon = document.getElementById('darkModeIcon');
    
    // Se houver preferência salva, aplicar
    if (darkModePreference === 'enabled') {
        body.classList.add('dark-mode');
        if (darkModeIcon) {
            darkModeIcon.classList.remove('fa-moon');
            darkModeIcon.classList.add('fa-sun');
        }
    } else if (darkModePreference === 'disabled') {
        body.classList.remove('dark-mode');
        if (darkModeIcon) {
            darkModeIcon.classList.remove('fa-sun');
            darkModeIcon.classList.add('fa-moon');
        }
    }
    // Se não houver preferência, manter o padrão do sistema (via CSS media query)
}

// ===============================
//  SISTEMA DE AUTENTICAÇÃO
// ===============================

// Verificar login será chamado no DOMContentLoaded principal

async function verificarLogin() {
    // Sistema de autenticação simplificado usando apenas localStorage
    verificarLoginLocalStorage();
}

function verificarLoginLocalStorage() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            isLoggedIn = true;
            atualizarUIUsuario();
            carregarDadosUsuario();
        } catch (e) {
            console.error('Erro ao carregar dados do usuário:', e);
        }
    }
}


function atualizarUIUsuario() {
    const userEmailEl = document.getElementById('userEmail');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    
    if (isLoggedIn && currentUser) {
        if (userEmailEl) userEmailEl.textContent = currentUser.email;
        if (userEmailEl) userEmailEl.style.display = 'block';
        if (loginButton) loginButton.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'block';
    } else {
        if (userEmailEl) userEmailEl.style.display = 'none';
        if (loginButton) loginButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none';
    }
}

function abrirModalLogin() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
        mostrarLogin();
    }
}

function fecharModalAuth() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('authError').style.display = 'none';
        document.getElementById('authForm').reset();
    }
}

function mostrarLogin() {
    currentAuthForm = 'login';
    const loginForm = document.getElementById('loginForm');
    const cadastroForm = document.getElementById('cadastroForm');
    
    loginForm.style.display = 'block';
    cadastroForm.style.display = 'none';
    
    // Remover required dos campos ocultos para evitar erro de validação
    cadastroForm.querySelectorAll('input[required]').forEach(input => {
        input.removeAttribute('required');
    });
    
    // Adicionar required aos campos visíveis
    loginForm.querySelectorAll('input[type="email"], input[type="password"]').forEach(input => {
        input.setAttribute('required', 'required');
    });
    
    document.getElementById('authModalTitle').textContent = 'Entrar';
    document.getElementById('authButtonText').textContent = 'Entrar';
    document.getElementById('loginTab').style.borderBottomColor = 'var(--primary-blue)';
    document.getElementById('loginTab').style.color = 'var(--primary-blue)';
    document.getElementById('cadastroTab').style.borderBottomColor = 'transparent';
    document.getElementById('cadastroTab').style.color = 'var(--text-medium)';
    document.getElementById('authError').style.display = 'none';
}

function mostrarCadastro() {
    currentAuthForm = 'cadastro';
    const loginForm = document.getElementById('loginForm');
    const cadastroForm = document.getElementById('cadastroForm');
    
    loginForm.style.display = 'none';
    cadastroForm.style.display = 'block';
    
    // Remover required dos campos ocultos para evitar erro de validação
    loginForm.querySelectorAll('input[required]').forEach(input => {
        input.removeAttribute('required');
    });
    
    // Adicionar required aos campos visíveis
    cadastroForm.querySelectorAll('input[type="email"], input[type="password"][id="cadastroPassword"], input[type="password"][id="cadastroPasswordConfirm"]').forEach(input => {
        input.setAttribute('required', 'required');
    });
    
    document.getElementById('authModalTitle').textContent = 'Cadastrar';
    document.getElementById('authButtonText').textContent = 'Cadastrar';
    document.getElementById('cadastroTab').style.borderBottomColor = 'var(--primary-blue)';
    document.getElementById('cadastroTab').style.color = 'var(--primary-blue)';
    document.getElementById('loginTab').style.borderBottomColor = 'transparent';
    document.getElementById('loginTab').style.color = 'var(--text-medium)';
    document.getElementById('authError').style.display = 'none';
}

async function handleAuth(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
    
    try {
        // Usar a variável global para determinar qual formulário está ativo
        if (currentAuthForm === 'login') {
            await fazerLogin();
        } else {
            await fazerCadastro();
        }
    } catch (error) {
        console.error('Erro no handleAuth:', error);
        mostrarErro('Ocorreu um erro. Por favor, tente novamente.');
    }
}

async function fazerLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        mostrarErro('Preencha todos os campos!');
        return;
    }
    
    // Tentar buscar usuário no NocoDB primeiro (funciona em qualquer dispositivo)
    let user = null;
    if (USE_NOCODB) {
        user = await buscarUsuarioNocoDB(email, password);
    }
    
    // Se não encontrou no NocoDB, tentar no localStorage (fallback)
    if (!user) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const localUser = users.find(u => u.email === email && u.password === password);
        if (localUser) {
            user = {
                email: localUser.email,
                nome: localUser.nome,
                id: localUser.id || localUser.email
            };
            // Sincronizar com NocoDB para funcionar em outros dispositivos
            await salvarUsuarioNocoDB(user.email, password, user.nome, user.id);
        }
    }
    
    if (user) {
        currentUser = user;
        isLoggedIn = true;
        localStorage.setItem('userData', JSON.stringify(currentUser));
        // Salvar também no localStorage local para fallback
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const existingUserIndex = users.findIndex(u => u.email === email);
        if (existingUserIndex >= 0) {
            users[existingUserIndex] = { ...users[existingUserIndex], ...user, password };
        } else {
            users.push({ ...user, password });
        }
        localStorage.setItem('users', JSON.stringify(users));
        
        atualizarUIUsuario();
        fecharModalAuth();
        await carregarDadosUsuario();
        alert('Login realizado com sucesso!');
    } else {
        mostrarErro('Email ou senha incorretos!');
    }
}

async function fazerCadastro() {
    try {
        const nomeEl = document.getElementById('cadastroNome');
        const emailEl = document.getElementById('cadastroEmail');
        const passwordEl = document.getElementById('cadastroPassword');
        const passwordConfirmEl = document.getElementById('cadastroPasswordConfirm');
        
        if (!nomeEl || !emailEl || !passwordEl || !passwordConfirmEl) {
            mostrarErro('Erro ao acessar os campos do formulário. Recarregue a página.');
            console.error('Elementos do formulário não encontrados');
            return;
        }
        
        const nome = nomeEl.value.trim();
        const email = emailEl.value.trim();
        const password = passwordEl.value;
        const passwordConfirm = passwordConfirmEl.value;
        
        if (!email || !password || !passwordConfirm) {
            mostrarErro('Preencha todos os campos obrigatórios!');
            return;
        }
        
        if (password.length < 6) {
            mostrarErro('A senha deve ter no mínimo 6 caracteres!');
            return;
        }
        
        if (password !== passwordConfirm) {
            mostrarErro('As senhas não coincidem!');
            return;
        }
        
        // Verificar se email já existe no NocoDB
        let emailExiste = false;
        if (USE_NOCODB) {
            const emailToSearch = encodeURIComponent(email);
            const checkParams = new URLSearchParams({
                offset: '0',
                limit: '25',
                where: `(Email,eq,${emailToSearch})`,
                viewId: NOCODB_VIEW_ID
            });
            const checkUrl = `${NOCODB_BASE_URL}?${checkParams.toString()}`;
            const checkResponse = await fetch(checkUrl, {
                method: 'GET',
                headers: {
                    'xc-token': NOCODB_API_TOKEN,
                    'Content-Type': 'application/json'
                }
            });
            
            if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                const existingRecords = checkData.list || checkData.records || [];
                emailExiste = existingRecords.length > 0;
            }
        }
        
        // Verificar também no localStorage local
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (emailExiste || users.find(u => u.email === email)) {
            mostrarErro('Este email já está cadastrado!');
            return;
        }
        
        const newUser = {
            id: Date.now().toString(), // ID único baseado em timestamp
            nome: nome || 'Usuário',
            email,
            password: password // Em produção, isso deve ser criptografado!
        };
        
        // Salvar no NocoDB primeiro (para funcionar em qualquer dispositivo)
        if (USE_NOCODB) {
            console.log('🔄 Tentando salvar usuário no NocoDB...', { email: newUser.email, nome: newUser.nome });
            const sucessoNoco = await salvarUsuarioNocoDB(newUser.email, newUser.password, newUser.nome, newUser.id);
            if (!sucessoNoco) {
                console.error('❌ Falha ao salvar no NocoDB. Verifique o console para mais detalhes.');
                mostrarErro('Não foi possível salvar no NocoDB. Verifique se os campos Password e Nome existem na tabela. O cadastro local foi realizado.');
                // Continuar mesmo se falhar no NocoDB
            } else {
                console.log('✅ Usuário salvo com sucesso no NocoDB!');
            }
        }
        
        // Salvar também no localStorage local (fallback)
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        currentUser = { 
            email: newUser.email, 
            nome: newUser.nome,
            id: newUser.id
        };
        isLoggedIn = true;
        localStorage.setItem('userData', JSON.stringify(currentUser));
        atualizarUIUsuario();
        fecharModalAuth();
        
        alert('Cadastro realizado com sucesso! Agora você pode fazer login em qualquer dispositivo.');
    } catch (error) {
        console.error('Erro em fazerCadastro:', error);
        mostrarErro('Ocorreu um erro ao processar o cadastro: ' + (error.message || 'Erro desconhecido'));
    }
}

function mostrarErro(mensagem) {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
        errorDiv.textContent = mensagem;
        errorDiv.style.display = 'block';
    } else {
        console.error('Erro de autenticação:', mensagem);
        alert(mensagem); // Fallback caso o elemento não exista
    }
}

async function logout() {
    if (confirm('Deseja realmente sair? Os dados deste usuário serão mantidos apenas na nuvem e no backup local, e os dados visíveis na tela serão limpos neste dispositivo.')) {
        // Limpar dados em memória
        transactions = [];
        faturasParceladas = [];
        despesasRecorrentes = [];
        receitasRecorrentes = [];

        // Limpar dados locais visíveis (dados globais)
        localStorage.removeItem('transactions');
        localStorage.removeItem('faturasParceladas');
        localStorage.removeItem('despesasRecorrentes');
        localStorage.removeItem('receitasRecorrentes');

        // Remover usuário atual (mantendo apenas snapshots por usuário, se existirem)
        currentUser = null;
        isLoggedIn = false;
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');

        // Atualizar interface para estado vazio/logoff
        atualizarUIUsuario();
        updateUI(currentMonth, currentYear);
        atualizarTabelaFaturas();
        atualizarTabelaDespesasRecorrentes();
        atualizarTabelaReceitasRecorrentes();

        alert('Logout realizado com sucesso! Os dados locais deste usuário foram removidos da tela deste dispositivo.');
    }
}

// ===============================
//  SINCRONIZAÇÃO DE DADOS - NOCODB
// ===============================

// Função para salvar usuário no NocoDB (para autenticação entre dispositivos)
async function salvarUsuarioNocoDB(email, password, nome, userId) {
    if (!USE_NOCODB) return false;
    
    try {
        const recordData = {
            Email: email || '',
            UserId: userId || email || '',
            Password: password, // Em produção, isso deve ser criptografado!
            Nome: nome || 'Usuário',
            FinanceData: JSON.stringify({
                transactions: [],
                faturasParceladas: [],
                despesasRecorrentes: [],
                receitasRecorrentes: [],
                updated_at: new Date().toISOString()
            })
        };

        // Verificar se já existe um registro com este email
        const emailToSearch = encodeURIComponent(email || '');
        const checkParams = new URLSearchParams({
            offset: '0',
            limit: '25',
            where: `(Email,eq,${emailToSearch})`,
            viewId: NOCODB_VIEW_ID
        });
        const checkUrl = `${NOCODB_BASE_URL}?${checkParams.toString()}`;
        
        const checkResponse = await fetch(checkUrl, {
            method: 'GET',
            headers: {
                'xc-token': NOCODB_API_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            const existingRecords = checkData.list || checkData.records || [];
            
            if (existingRecords.length > 0) {
                // Atualizar registro existente (atualizar senha/nome)
                const recordId = existingRecords[0].Id || existingRecords[0].id || existingRecords[0]._id;
                const updateUrl = `${NOCODB_BASE_URL}/${recordId}`;
                
                const updateResponse = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                        'xc-token': NOCODB_API_TOKEN,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        Password: password,
                        Nome: nome || 'Usuário',
                        UserId: userId || email
                    })
                });

                if (updateResponse.ok) {
                    console.log('✅ Usuário atualizado com sucesso no NocoDB');
                    return true;
                } else {
                    const errorText = await updateResponse.text();
                    console.error('❌ Erro ao atualizar usuário no NocoDB:', errorText);
                    return false;
                }
            } else {
                // Criar novo registro
                const createParams = new URLSearchParams({
                    offset: '0',
                    limit: '25',
                    where: '',
                    viewId: NOCODB_VIEW_ID
                });
                const createUrl = `${NOCODB_BASE_URL}?${createParams.toString()}`;
                const createResponse = await fetch(createUrl, {
                    method: 'POST',
                    headers: {
                        'xc-token': NOCODB_API_TOKEN,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(recordData)
                });

                if (createResponse.ok) {
                    const responseData = await createResponse.json();
                    console.log('✅ Usuário criado com sucesso no NocoDB');
                    console.log('Resposta do NocoDB:', responseData);
                    return true;
                } else {
                    const errorText = await createResponse.text();
                    console.error('❌ Erro ao criar usuário no NocoDB');
                    console.error('Status HTTP:', createResponse.status, createResponse.statusText);
                    console.error('Resposta completa:', errorText);
                    console.error('URL da requisição:', createUrl);
                    console.error('Dados enviados:', JSON.stringify(recordData, null, 2));
                    console.error('⚠️ VERIFIQUE: Os campos Password e Nome existem na tabela do NocoDB?');
                    return false;
                }
            }
        } else {
            const errorText = await checkResponse.text();
            console.error('❌ Erro ao verificar usuário no NocoDB');
            console.error('Status:', checkResponse.status);
            console.error('Resposta:', errorText);
            console.error('URL:', checkUrl);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao salvar usuário no NocoDB:', error);
        return false;
    }
}

// Função para buscar usuário no NocoDB (para login entre dispositivos)
async function buscarUsuarioNocoDB(email, password) {
    if (!USE_NOCODB) return null;
    
    try {
        const emailToSearch = encodeURIComponent(email || '');
        const params = new URLSearchParams({
            offset: '0',
            limit: '25',
            where: `(Email,eq,${emailToSearch})`,
            viewId: NOCODB_VIEW_ID
        });
        const url = `${NOCODB_BASE_URL}?${params.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'xc-token': NOCODB_API_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const records = data.list || data.records || [];
            
            if (records.length > 0) {
                const record = records[0];
                const recordPassword = record.Password || record.password;
                const recordNome = record.Nome || record.nome || email;
                const recordUserId = record.UserId || record.userId || record.Id || email;
                
                // Verificar senha
                if (recordPassword === password) {
                    return {
                        email: email,
                        nome: recordNome,
                        id: recordUserId
                    };
                } else {
                    return null; // Senha incorreta
                }
            }
        } else {
            console.error('❌ Erro ao buscar usuário no NocoDB:', await response.text());
        }
    } catch (error) {
        console.error('❌ Erro ao buscar usuário no NocoDB:', error);
    }
    
    return null;
}

// Função para salvar dados no NocoDB
// Estrutura salva em um único campo JSON (FinanceData) por usuário (Email/UserId)
async function salvarDadosNocoDB(dadosUsuario) {
    if (!USE_NOCODB || !currentUser) return false;
    
    try {
        // Objeto completo com todos os dados financeiros
        const financeData = {
            transactions: dadosUsuario.transactions || [],
            faturasParceladas: dadosUsuario.faturasParceladas || [],
            despesasRecorrentes: dadosUsuario.despesasRecorrentes || [],
            receitasRecorrentes: dadosUsuario.receitasRecorrentes || [],
            updated_at: dadosUsuario.updated_at || new Date().toISOString()
        };

        // Preparar dados para o formato do NocoDB
        // IMPORTANTE: criar no NocoDB os campos:
        // - Email (texto ou email, único)
        // - UserId (texto, único)
        // - FinanceData (Long Text ou JSON)
        // - UpdatedAt (DateTime - auto-gerado pelo NocoDB, NÃO enviar no payload)
        const recordData = {
            Email: currentUser.email || '',
            UserId: currentUser.id || currentUser.email || '',
            FinanceData: JSON.stringify(financeData)
            // UpdatedAt é removido - o NocoDB gerencia automaticamente este campo
        };

        // Primeiro, verificar se já existe um registro com este email/userId
        // Tentar diferentes formatos de query
        const emailToSearch = encodeURIComponent(currentUser.email || '');
        const checkParams = new URLSearchParams({
            offset: '0',
            limit: '25',
            where: `(Email,eq,${emailToSearch})`,
            viewId: NOCODB_VIEW_ID
        });
        const checkUrl = `${NOCODB_BASE_URL}?${checkParams.toString()}`;
        
        const checkResponse = await fetch(checkUrl, {
            method: 'GET',
            headers: {
                'xc-token': NOCODB_API_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            const existingRecords = checkData.list || checkData.records || [];
            
            if (existingRecords.length > 0) {
                // Atualizar registro existente
                // O ID pode estar em diferentes campos (Id, id, _id, etc)
                const recordId = existingRecords[0].Id || existingRecords[0].id || existingRecords[0]._id || existingRecords[0].Id;
                const updateUrl = `${NOCODB_BASE_URL}/${recordId}`;
                
                const updateResponse = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                        'xc-token': NOCODB_API_TOKEN,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(recordData)
                });

                if (updateResponse.ok) {
                    console.log('✅ Dados atualizados com sucesso no NocoDB');
                    return true;
                } else {
                    const errorText = await updateResponse.text();
                    console.error('❌ Erro ao atualizar dados no NocoDB:', errorText);
                    console.error('URL:', updateUrl);
                    console.error('Dados enviados:', recordData);
                    return false;
                }
            } else {
                // Criar novo registro
                const createParams = new URLSearchParams({
                    offset: '0',
                    limit: '25',
                    where: '',
                    viewId: NOCODB_VIEW_ID
                });
                const createUrl = `${NOCODB_BASE_URL}?${createParams.toString()}`;
                const createResponse = await fetch(createUrl, {
                    method: 'POST',
                    headers: {
                        'xc-token': NOCODB_API_TOKEN,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(recordData)
                });

                if (createResponse.ok) {
                    console.log('✅ Dados criados com sucesso no NocoDB');
                    return true;
                } else {
                    const errorText = await createResponse.text();
                    console.error('❌ Erro ao criar dados no NocoDB:', errorText);
                    console.error('URL:', createUrl);
                    console.error('Dados enviados:', recordData);
                    return false;
                }
            }
        } else {
            const errorText = await checkResponse.text();
            console.error('❌ Erro ao verificar registros no NocoDB:', errorText);
            console.error('URL:', checkUrl);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao salvar dados no NocoDB:', error);
        return false;
    }
}

// Função para carregar dados do NocoDB
// Lê todos os dados financeiros de um único campo JSON (FinanceData)
async function carregarDadosNocoDB() {
    if (!USE_NOCODB || !isLoggedIn || !currentUser) return null;
    
    try {
        const emailToSearch = encodeURIComponent(currentUser.email || '');
        const params = new URLSearchParams({
            offset: '0',
            limit: '25',
            where: `(Email,eq,${emailToSearch})`,
            viewId: NOCODB_VIEW_ID
        });
        const url = `${NOCODB_BASE_URL}?${params.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'xc-token': NOCODB_API_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const records = data.list || data.records || [];
            
            if (records.length > 0) {
                const record = records[0];
                // Campo principal de dados financeiros
                const financeField = record.FinanceData || record.financedata || record.financeData;

                if (financeField) {
                    const parsed = typeof financeField === 'string' ? JSON.parse(financeField) : financeField;
                    return {
                        transactions: parsed.transactions || [],
                        faturasParceladas: parsed.faturasParceladas || [],
                        despesasRecorrentes: parsed.despesasRecorrentes || [],
                        receitasRecorrentes: parsed.receitasRecorrentes || []
                    };
                } else {
                    console.log('ℹ️ Registro no NocoDB encontrado, mas campo FinanceData está vazio.');
                    return {
                        transactions: [],
                        faturasParceladas: [],
                        despesasRecorrentes: [],
                        receitasRecorrentes: []
                    };
                }
            } else {
                console.log('ℹ️ Nenhum registro encontrado no NocoDB para este usuário');
            }
        } else {
            const errorText = await response.text();
            console.error('❌ Erro ao carregar dados do NocoDB:', errorText);
            console.error('URL:', url);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados do NocoDB:', error);
    }
    
    return null;
}

// ===============================
//  SINCRONIZAÇÃO DE DADOS
// ===============================

async function salvarDadosUsuario() {
    if (!isLoggedIn || !currentUser) return;
    
    const dadosUsuario = {
        transactions,
        faturasParceladas,
        despesasRecorrentes,
        receitasRecorrentes,
        user_id: currentUser.id || currentUser.email,
        updated_at: new Date().toISOString()
    };
    
    // Salvar no NocoDB (backend principal)
    let sucessoNoco = false;
    if (USE_NOCODB) {
        sucessoNoco = await salvarDadosNocoDB(dadosUsuario);
    }
    
    // Sempre manter uma cópia no localStorage (por usuário) como backup
    localStorage.setItem(`userData_${currentUser.email}`, JSON.stringify(dadosUsuario));

    return sucessoNoco;
}

// Atualiza o snapshot de dados financeiros do usuário logado no localStorage
function atualizarBackupUsuarioLocal() {
    if (!isLoggedIn || !currentUser) return;
    
    const chave = `userData_${currentUser.email}`;
    let dadosExistentes = {};
    try {
        const salvo = localStorage.getItem(chave);
        if (salvo) {
            dadosExistentes = JSON.parse(salvo) || {};
        }
    } catch (e) {
        console.warn('Não foi possível ler userData local, recriando.', e);
    }
    
    const dadosAtualizados = {
        ...dadosExistentes,
        user_id: currentUser.id || currentUser.email,
        transactions,
        faturasParceladas,
        despesasRecorrentes,
        receitasRecorrentes,
        updated_at: new Date().toISOString()
    };
    
    localStorage.setItem(chave, JSON.stringify(dadosAtualizados));
}

// Função chamada pelo botão "Salvar na nuvem"
async function sincronizarDadosNuvem() {
    if (!isLoggedIn || !currentUser) {
        alert('Faça login para salvar seus dados na nuvem.');
        return;
    }
    
    try {
        const sucesso = await salvarDadosUsuario();
        if (sucesso) {
            alert('Dados salvos na nuvem com sucesso!');
        } else {
            alert('Não foi possível salvar na nuvem agora. Seus dados continuam salvos neste dispositivo.');
        }
    } catch (error) {
        console.error('Erro ao sincronizar com a nuvem:', error);
        alert('Erro ao salvar na nuvem. Tente novamente mais tarde.');
    }
}

async function carregarDadosUsuario() {
    if (!isLoggedIn || !currentUser) return;
    
    // 1) Tentar carregar primeiro o snapshot local do usuário
    let dadosSelecionados = null;
    const chave = `userData_${currentUser.email}`;
    const localSalvo = localStorage.getItem(chave);
    if (localSalvo) {
        try {
            dadosSelecionados = JSON.parse(localSalvo);
        } catch (e) {
            console.warn('Não foi possível ler dados locais do usuário, ignorando snapshot.', e);
        }
    }

    // 2) Tentar buscar no NocoDB e comparar datas (usa o mais recente)
    if (USE_NOCODB) {
        const dadosNocoDB = await carregarDadosNocoDB();
        if (dadosNocoDB) {
            const dataLocal = dadosSelecionados && dadosSelecionados.updated_at ? new Date(dadosSelecionados.updated_at).getTime() : 0;
            const dataNoco = dadosNocoDB.updated_at ? new Date(dadosNocoDB.updated_at).getTime() : 0;
            
            if (!dadosSelecionados || dataNoco > dataLocal) {
                dadosSelecionados = dadosNocoDB;
                console.log('✅ Dados carregados do NocoDB (mais recentes que o local).');
            } else {
                console.log('ℹ️ Mantendo dados locais mais recentes que os do NocoDB.');
            }
        }
    }

    if (dadosSelecionados) {
        transactions = dadosSelecionados.transactions || [];
        faturasParceladas = dadosSelecionados.faturasParceladas || [];
        despesasRecorrentes = dadosSelecionados.despesasRecorrentes || [];
        receitasRecorrentes = dadosSelecionados.receitasRecorrentes || [];
        
        // Atualizar localStorage padrão e snapshot local
        salvarLocal();
        salvarFaturasLocal();
        salvarDespesasRecorrentesLocal();
        salvarReceitasRecorrentesLocal();
        
        // Atualizar UI
        updateUI(currentMonth, currentYear);
        atualizarTabelaFaturas();
        atualizarTabelaDespesasRecorrentes();
        atualizarTabelaReceitasRecorrentes();
    } else {
        // Se não há dados de usuário, apenas mantém o que já foi carregado do localStorage global
        updateUI(currentMonth, currentYear);
        atualizarTabelaFaturas();
        atualizarTabelaDespesasRecorrentes();
        atualizarTabelaReceitasRecorrentes();
    }
}
