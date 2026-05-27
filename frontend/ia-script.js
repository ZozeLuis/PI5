// ============================================================
// NOTIFICAÇÕES
// ============================================================

function mostrarNotificacao(mensagem, tipo = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    const icons   = { success: 'check-circle-fill', error: 'x-circle-fill', warning: 'exclamation-triangle-fill', info: 'info-circle-fill' };
    const classes = { success: 'text-bg-success',   error: 'text-bg-danger',  warning: 'text-bg-warning',          info: 'text-bg-info' };

    const toastEl = document.createElement('div');
    toastEl.id = 'toast-' + Date.now();
    toastEl.className = `toast align-items-center ${classes[tipo] || classes.info} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center gap-2">
                <i class="bi bi-${icons[tipo] || icons.info}"></i>
                ${mensagem}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>`;

    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const campoData = document.getElementById('dataHojeExibicao');
    if (campoData) {
        // Preenche com hoje no formato yyyy-mm-dd (exigido pelo type="date")
        const hoje = new Date();
        campoData.value = hoje.toISOString().split('T')[0];
    }

    const previsaoSalva = localStorage.getItem('ultimaPrevisao');
    if (previsaoSalva) {
        const dados = JSON.parse(previsaoSalva);
        if (dados.dataGravada === new Date().toLocaleDateString('pt-BR')) {
            exibirResultadosNaTela(dados);
        }
    }
});

// Função isolada para preencher os campos (evita repetição de código)
function exibirResultadosNaTela(dadosIA) {
    document.getElementById('resTotal').innerText = `R$ ${dadosIA.faturamento_total.toFixed(2)}`;
    document.getElementById('resPresencial').innerText = `${parseInt(dadosIA.pedidos_presenciais)} un.`;
    document.getElementById('resDelivery').innerText = `${parseInt(dadosIA.pedidos_delivery)} un.`;
    document.getElementById('resLanches').innerText = `${dadosIA.qtd_lanches} un.`;
    document.getElementById('resCombos').innerText = `${dadosIA.qtd_combos} un.`;
    document.getElementById('resBebidas').innerText = `${dadosIA.qtd_bebidas} un.`;
    document.getElementById('resSobremesas').innerText = `${dadosIA.qtd_sobremesas} un.`;

    const painel = document.getElementById('painelResultados');
    if (painel) painel.style.display = 'block';
    
    const placeholder = document.getElementById('placeholderIA');
    if (placeholder) placeholder.classList.add('d-none');
}

async function chamarPrevisaoIA(event) {
    event.preventDefault();

    // Usa a data escolhida pelo usuário (T12:00:00 evita erro de fuso horário)
    const valorData   = document.getElementById('dataHojeExibicao').value;
    const dataSimulada = new Date(valorData + 'T12:00:00');

    const dia_do_mes   = dataSimulada.getDate();
    const mes          = dataSimulada.getMonth() + 1;
    const jsDiaSemana  = dataSimulada.getDay();

    const dia_da_semana  = jsDiaSemana === 0 ? 7 : jsDiaSemana;
    const final_de_semana = (dia_da_semana === 6 || dia_da_semana === 7) ? 1 : 0;
    const epoca_pagamento = dia_do_mes <= 10 ? 1 : 0;

    const condicao_climatica = parseInt(document.getElementById('climaSimulacao').value);
    const intensidade_chuva = parseInt(document.getElementById('chuvaSimulacao').value);
    const promoção_ativa = parseInt(document.getElementById('promoSimulacao').value);

    const dadosParaEnviar = {
        dia_da_semana, mês: mes, dia_do_mes: dia_do_mes, epoca_pagamento,
        feriado: 0, promoção_ativa, final_de_semana, data_comemorativa: 0,
        condição_climática: condicao_climatica, intensidade_chuva: intensidade_chuva
    };

    try {
        const response = await fetch('http://localhost:5000/prever_tudo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosParaEnviar)
        });

        if (!response.ok) throw new Error("Erro na comunicação com o servidor Python.");

        const dadosIA = await response.json();

        // 2. Salva no localStorage para o Dashboard e para esta própria página
        const dadosParaSalvar = {
            ...dadosIA,
            dataGravada: agora.toLocaleDateString('pt-BR')
        };
        localStorage.setItem('ultimaPrevisao', JSON.stringify(dadosParaSalvar));

        // 3. Exibe na tela
        exibirResultadosNaTela(dadosIA);

    } catch (error) {
        console.error("Erro:", error);
        mostrarNotificacao('Erro ao consultar a IA. O servidor Python está rodando?', 'error');
    }
}