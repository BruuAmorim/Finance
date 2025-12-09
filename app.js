// ===============================
//  VARIÁVEIS GLOBAIS
// ===============================
let transactions = [];
let faturasParceladas = [];
let despesasRecorrentes = [];
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

    const dadosDespesasRecorrentes = localStorage.getItem("despesasRecorrentes");
    if (dadosDespesasRecorrentes) {
        despesasRecorrentes = JSON.parse(dadosDespesasRecorrentes);
    }

    document.getElementById('date').valueAsDate = new Date();
    const hoje = new Date();
    document.getElementById('faturaDataInicio').valueAsDate = hoje;
    const proximoMes = new Date(hoje);
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    document.getElementById('faturaDataVencimento').valueAsDate = proximoMes;
    initCharts();
    
    // Gerar transações automáticas de despesas recorrentes
    gerarTransacoesRecorrentes();
    
    updateUI(currentMonth, currentYear);
    atualizarTabelaFaturas();
    atualizarFiltros();
    atualizarTabelaDespesasRecorrentes();
    
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

    // Adicionar event listeners para calcular automaticamente a última parcela
    const faturaDataInicio = document.getElementById('faturaDataInicio');
    const faturaParcelas = document.getElementById('faturaParcelas');
    
    if (faturaDataInicio) {
        faturaDataInicio.addEventListener('change', calcularUltimaParcelaAuto);
    }
    if (faturaParcelas) {
        faturaParcelas.addEventListener('change', calcularUltimaParcelaAuto);
        faturaParcelas.addEventListener('input', calcularUltimaParcelaAuto);
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

// Preenche automaticamente a data de vencimento final com base na 1ª parcela e no total
function preencherUltimaParcela() {
    const inicioEl = document.getElementById('faturaDataInicio');
    const parcelasEl = document.getElementById('faturaParcelas');
    const vencimentoEl = document.getElementById('faturaDataVencimento');

    if (!inicioEl || !parcelasEl || !vencimentoEl) return;

    const inicio = inicioEl.value;
    const parcelas = parseInt(parcelasEl.value);

    if (!inicio || !parcelas || parcelas <= 0) {
        alert("Informe a data da primeira parcela e o número total de parcelas.");
        return;
    }

    const dataFinal = new Date(inicio);
    dataFinal.setMonth(dataFinal.getMonth() + (parcelas - 1));
    vencimentoEl.valueAsDate = dataFinal;
}

// Calcula automaticamente a última parcela quando os campos mudam
function calcularUltimaParcelaAuto() {
    const inicioEl = document.getElementById('faturaDataInicio');
    const parcelasEl = document.getElementById('faturaParcelas');
    const vencimentoEl = document.getElementById('faturaDataVencimento');

    if (!inicioEl || !parcelasEl || !vencimentoEl) return;

    const inicio = inicioEl.value;
    const parcelas = parseInt(parcelasEl.value);

    // Só calcula se ambos os campos estiverem preenchidos
    if (inicio && parcelas && parcelas > 0) {
        const dataFinal = new Date(inicio);
        dataFinal.setMonth(dataFinal.getMonth() + (parcelas - 1));
        vencimentoEl.valueAsDate = dataFinal;
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

// ===============================
//  DESPESAS RECORRENTES
// ===============================

function salvarDespesasRecorrentesLocal() {
    localStorage.setItem("despesasRecorrentes", JSON.stringify(despesasRecorrentes));
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
    const categoria = document.getElementById('despesaRecorrenteCategoria').value.trim();
    const valor = parseFloat(document.getElementById('despesaRecorrenteValor').value);
    const dia = parseInt(document.getElementById('despesaRecorrenteDia').value);
    const inicio = document.getElementById('despesaRecorrenteInicio').value;
    const termino = document.getElementById('despesaRecorrenteTermino').value;
    const obs = document.getElementById('despesaRecorrenteObs').value.trim();

    if (!descricao || !categoria || isNaN(valor) || valor <= 0 || !dia || dia < 1 || dia > 31 || !inicio) {
        alert("Preencha todos os campos obrigatórios corretamente!");
        return;
    }

    const novaDespesaRecorrente = {
        id: Date.now(),
        descricao,
        categoria,
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
                <td>${despesa.categoria}</td>
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
    if (!confirm("Deseja remover esta despesa recorrente? As transações já geradas não serão removidas.")) return;

    // Remover transações futuras relacionadas
    const hoje = new Date();
    transactions = transactions.filter(t => {
        if (t.recorrenteId === despesaId) {
            const dataTransacao = new Date(t.date);
            return dataTransacao < hoje;
        }
        return true;
    });
    
    despesasRecorrentes = despesasRecorrentes.filter(d => d.id !== despesaId);
    salvarDespesasRecorrentesLocal();
    salvarLocal();
    atualizarTabelaDespesasRecorrentes();
    updateUI(currentMonth, currentYear);
}
