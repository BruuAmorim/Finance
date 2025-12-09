// ===============================
//  VARIÁVEIS GLOBAIS
// ===============================
let transactions = [];
let faturasParceladas = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

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
    }

    document.getElementById('date').valueAsDate = new Date();
    const hoje = new Date();
    document.getElementById('faturaDataInicio').valueAsDate = hoje;
    const proximoMes = new Date(hoje);
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    document.getElementById('faturaDataVencimento').valueAsDate = proximoMes;
    initCharts();
    updateUI(currentMonth, currentYear);
    atualizarTabelaFaturas();
    atualizarFiltros();
    
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
});

// ===============================
//  SALVAR NO LOCALSTORAGE
// ===============================
function salvarLocal() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
}

// ===============================
//  INICIALIZAÇÃO DOS GRÁFICOS
// ===============================
let lineChart, pieChart;

function initCharts() {
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    const ctxPie = document.getElementById('pieChart').getContext('2d');

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

    listSimple.innerHTML = "";
    tableBody.innerHTML = "";

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
    let categories = {};
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

        if (!categories[t.category]) categories[t.category] = 0;
        categories[t.category] += t.amount;

        const money = t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        listSimple.innerHTML += `
            <div class="transaction-item">
                <div class="t-info">
                    <h4>${t.category}</h4>
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

        tableBody.innerHTML += `
            <tr>
                <td>${t.date}</td>
                <td>${t.category}</td>
                <td style="color:${t.type === "Receita" ? "#66bb6a" : "#e53935"}">${t.type}</td>
                <td>${money}</td>
                <td>${t.obs || ""}</td>
            </tr>
        `;
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

    // Atualizar gráfico de pizza
    pieChart.data.labels = Object.keys(categories);
    pieChart.data.datasets[0].data = Object.values(categories);
    pieChart.update();

    // Atualizar gráfico de linha com dados semanais do mês
    atualizarGraficoLinha(transacoesParaExibir, filterMonth, filterYear);
}
// ===============================
//  ADICIONAR TRANSAÇÃO
// ===============================
function addTransaction(e) {
    e.preventDefault();

    // Capturar campos dinamicamente
    const dateInput = document.getElementById("date");
    const typeInput = document.getElementById("type");
    const categoryInput = document.getElementById("category");
    const amountInput = document.getElementById("amount");
    const obsInput = document.getElementById("obs");

    const date = dateInput.value;
    const type = typeInput.value;
    const category = categoryInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const obs = obsInput.value.trim();

    // Validação
    if (!date || !category || isNaN(amount) || amount <= 0) {
        alert("Preencha todos os campos corretamente! O valor deve ser maior que zero.");
        return;
    }

    const nova = {
        id: Date.now(),
        date, 
        type, 
        category,
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
function exportCSV() {
    let csv = "Data,Categoria,Tipo,Valor,Obs\n";

    transactions.forEach(t => {
        csv += `${t.date},${t.category},${t.type},${t.amount},${t.obs}\n`;
    });

    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = "relatorio_evacloud.csv";
    link.click();
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
function gerarPDFMes(offset) {
    const hoje = new Date();
    hoje.setMonth(hoje.getMonth() + offset);
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();
    
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
                        return `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px; border: 1px solid #ddd;">${t.date}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${t.category}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; color: ${t.type === "Receita" ? "#66bb6a" : "#e53935"};">${t.type}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${money}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${t.obs || "-"}</td>
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
//  FATURAS PARCELADAS
// ===============================

function salvarFaturasLocal() {
    localStorage.setItem("faturasParceladas", JSON.stringify(faturasParceladas));
}

function toggleFaturaForm() {
    const container = document.getElementById('faturaFormContainer');
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
}

function adicionarFaturaParcelada(e) {
    e.preventDefault();

    const cartao = document.getElementById('faturaCartao').value.trim();
    const banco = document.getElementById('faturaBanco').value.trim();
    const valorTotal = parseFloat(document.getElementById('faturaValorTotal').value);
    const parcelas = parseInt(document.getElementById('faturaParcelas').value);
    const dataInicio = document.getElementById('faturaDataInicio').value;
    const dataVencimento = document.getElementById('faturaDataVencimento').value;
    const parcelasPagas = parseInt(document.getElementById('faturaParcelasPagas').value) || 0;
    const taxaJuros = parseFloat(document.getElementById('faturaTaxaJuros').value);
    const descricao = document.getElementById('faturaDescricao').value.trim();

    if (!cartao || !banco || isNaN(valorTotal) || valorTotal <= 0 || !parcelas || parcelas <= 0 || !dataInicio || !dataVencimento) {
        alert("Preencha todos os campos obrigatórios corretamente!");
        return;
    }

    if (parcelasPagas < 0 || parcelasPagas >= parcelas) {
        alert("O número de parcelas pagas deve ser menor que o total de parcelas!");
        return;
    }

    const valorParcela = valorTotal / parcelas;
    const dataInicioObj = new Date(dataInicio);
    const dataVencimentoObj = new Date(dataVencimento);
    
    // Calcular datas das parcelas
    const parcelasDetalhes = [];
    for (let i = 0; i < parcelas; i++) {
        const dataParcela = new Date(dataInicioObj);
        dataParcela.setMonth(dataParcela.getMonth() + i);
        
        // Marcar as primeiras parcelas como pagas se informado
        const paga = i < parcelasPagas;
        
        parcelasDetalhes.push({
            numero: i + 1,
            data: dataParcela.toISOString().split('T')[0],
            valor: valorParcela,
            paga: paga
        });
    }

    // Calcular data final
    const dataFinal = new Date(dataInicioObj);
    dataFinal.setMonth(dataFinal.getMonth() + parcelas - 1);

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
        dataVencimento: dataVencimento,
        dataFinal: dataFinal.toISOString().split('T')[0],
        taxaJuros,
        descricao: descricao || "",
        parcelasDetalhes,
        dataCriacao: new Date().toISOString()
    };

    faturasParceladas.push(novaFatura);
    salvarFaturasLocal();
    atualizarTabelaFaturas();
    atualizarFiltros();
    document.getElementById('faturaForm').reset();
    const hoje = new Date();
    document.getElementById('faturaDataInicio').valueAsDate = hoje;
    const proximoMes = new Date(hoje);
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    document.getElementById('faturaDataVencimento').valueAsDate = proximoMes;
    document.getElementById('faturaParcelasPagas').value = 0;
    toggleFaturaForm();

    alert("Fatura parcelada adicionada com sucesso!");
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

    // Usar a data de vencimento informada ou a data da próxima parcela
    const dataVencimento = fatura.dataVencimento ? new Date(fatura.dataVencimento) : new Date(proximaParcela.data);
    const diasAtraso = Math.max(0, Math.floor((hoje - dataVencimento) / (1000 * 60 * 60 * 24)));
    
    const juros = calcularJurosAtraso(fatura, diasAtraso);
    const valorTotal = proximaParcela.valor + juros;

    return {
        valor: valorTotal,
        diasAtraso,
        juros,
        dataVencimento: fatura.dataVencimento || proximaParcela.data,
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
                <td colspan="11" style="text-align: center; padding: 40px; color: var(--text-light);">
                    Nenhuma fatura parcelada cadastrada.
                </td>
            </tr>
        `;
        return;
    }

    faturasParceladas.forEach(fatura => {
        // Atualizar parcelas restantes automaticamente
        calcularParcelasRestantes(fatura);
        
        const proximoValor = calcularProximoValor(fatura);
        const valorFormatado = fatura.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const parcelaFormatada = fatura.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const proximoValorFormatado = proximoValor.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        // Usar a data de vencimento informada ou calcular da próxima parcela
        const dataVencimento = fatura.dataVencimento ? 
            new Date(fatura.dataVencimento).toLocaleDateString('pt-BR') : 
            (proximoValor.dataVencimento ? new Date(proximoValor.dataVencimento).toLocaleDateString('pt-BR') : '-');
        const dataFinal = fatura.dataFinal ? new Date(fatura.dataFinal).toLocaleDateString('pt-BR') : '-';
        
        let statusClass = '';
        let statusText = '';
        if (proximoValor.diasAtraso > 0) {
            statusClass = 'expense';
            statusText = `⚠️ ${proximoValor.diasAtraso} dias atrasado`;
        } else {
            statusClass = 'income';
            statusText = '✓ Em dia';
        }

        tbody.innerHTML += `
            <tr data-fatura-id="${fatura.id}" data-cartao="${fatura.cartao}" data-banco="${fatura.banco}" data-parcelas="${fatura.parcelasRestantes}">
                <td>${fatura.cartao}</td>
                <td>${fatura.banco}</td>
                <td style="font-weight: 600;">${valorFormatado}</td>
                <td>${fatura.parcelas}x</td>
                <td style="color: var(--accent-green); font-weight: 600;">${fatura.parcelasPagas}</td>
                <td><strong style="color: var(--accent-red);">${fatura.parcelasRestantes}</strong></td>
                <td>${parcelaFormatada}</td>
                <td>${dataVencimento}</td>
                <td style="font-weight: 600;">${dataFinal}</td>
                <td style="font-weight: 700; color: ${proximoValor.diasAtraso > 0 ? 'var(--accent-red)' : 'var(--accent-green)'};">
                    ${proximoValorFormatado}
                    ${proximoValor.juros > 0 ? `<br><small style="color: var(--accent-red);">(+ ${proximoValor.juros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} juros)</small>` : ''}
                </td>
                <td>
                    <button onclick="abrirModalParcelas(${fatura.id})" class="btn-add" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 5px; margin-bottom: 5px;">
                        <i class="fas fa-edit"></i> Parcelas
                    </button>
                    <button onclick="marcarParcelaPaga(${fatura.id})" class="btn-add" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 5px; margin-bottom: 5px;">
                        <i class="fas fa-check"></i> Pagar
                    </button>
                    <button onclick="removerFatura(${fatura.id})" class="btn-clear" style="padding: 6px 12px; font-size: 0.85rem;">
                        <i class="fas fa-trash"></i>
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

    salvarFaturasLocal();
    atualizarTabelaFaturas();
    atualizarFiltros();
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

    salvarFaturasLocal();
    fecharModalParcelas();
    atualizarTabelaFaturas();
    atualizarFiltros();
}

function removerFatura(faturaId) {
    if (!confirm("Deseja remover esta fatura parcelada?")) return;

    faturasParceladas = faturasParceladas.filter(f => f.id !== faturaId);
    salvarFaturasLocal();
    atualizarTabelaFaturas();
    atualizarFiltros();
}
