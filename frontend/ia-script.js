// 1. Ao carregar a página da IA
document.addEventListener('DOMContentLoaded', () => {
    // Exibe a data de hoje no campo de leitura
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR');
    const campoData = document.getElementById('dataHojeExibicao');
    if (campoData) campoData.value = dataFormatada;

    // NOVIDADE: Verifica se já existe uma previsão de hoje salva e mostra na tela
    const previsaoSalva = localStorage.getItem('ultimaPrevisao');
    if (previsaoSalva) {
        const dados = JSON.parse(previsaoSalva);
        // Só restaura se a previsão for de hoje
        if (dados.dataGravada === dataFormatada) {
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

    const agora = new Date();
    const dia_do_mes = agora.getDate();
    const mes = agora.getMonth() + 1;
    const jsDiaSemana = agora.getDay();
    
    const dia_da_semana = jsDiaSemana === 0 ? 7 : jsDiaSemana;
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
        alert("Erro ao consultar a IA. O servidor Flask está rodando?");
    }
}