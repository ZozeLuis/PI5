const API_URL = 'http://localhost:3000';
let listaIngredientesGlobal = [];

// ============================================================
// NOTIFICAÇÕES (substitui alert)
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

    const icons = {
        success: 'check-circle-fill',
        error:   'x-circle-fill',
        warning: 'exclamation-triangle-fill',
        info:    'info-circle-fill',
    };
    const classes = {
        success: 'text-bg-success',
        error:   'text-bg-danger',
        warning: 'text-bg-warning',
        info:    'text-bg-info',
    };

    const id = 'toast-' + Date.now();
    const toastEl = document.createElement('div');
    toastEl.id = id;
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
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDadosBase();
    atualizarInterface();
    configurarFormularios();
    carregarPrevisaoNoDash();

    if (document.getElementById('tabela-resumo')) {
        inicializarDashboard();
    }
});

// ============================================================
// DADOS BASE (ingredientes)
// ============================================================

async function carregarDadosBase() {
    try {
        const res = await fetch(`${API_URL}/itens`);
        listaIngredientesGlobal = await res.json();
    } catch (err) {
        console.error('Erro ao carregar ingredientes:', err);
    }
}

// ============================================================
// ATUALIZAÇÃO DE INTERFACE (shared entre páginas)
// ============================================================

async function atualizarInterface() {
    const selectIng     = document.getElementById('selectIngrediente') || document.getElementById('selectEstoqueItem');
    const tabelaSaldo   = document.getElementById('tabela-saldo-real');
    const tabelaProd    = document.getElementById('tabelaProdutosCorpo');
    const selectProd    = document.getElementById('selectProduto');

    // Dropdown de ingredientes (estoque.html)
    if (selectIng) {
        selectIng.innerHTML = '<option value="">Selecione o ingrediente...</option>';
        listaIngredientesGlobal.forEach(item => {
            selectIng.innerHTML += `<option value="${item.id}">${item.nome} (${item.unidade_medida})</option>`;
        });
    }

    // Tabela de saldo (estoque.html)
    if (tabelaSaldo) {
        tabelaSaldo.innerHTML = '';
        listaIngredientesGlobal.forEach(item => {
            tabelaSaldo.innerHTML += `
                <tr>
                    <td><strong>${item.nome}</strong></td>
                    <td>${item.quantidade_estoque || 0}</td>
                    <td>${item.unidade_medida}</td>
                </tr>`;
        });
    }

    // Tabela e dropdown de produtos (cadastro.html)
    if (tabelaProd || selectProd) {
        try {
            const res = await fetch(`${API_URL}/produtos`);
            const produtos = await res.json();

            if (selectProd) {
                selectProd.innerHTML = '<option value="">Selecione o produto...</option>';
                produtos.forEach(p => {
                    selectProd.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
                });
            }

            if (tabelaProd) {
                tabelaProd.innerHTML = '';
                produtos.forEach(p => {
                    tabelaProd.innerHTML += `
                        <tr>
                            <td><strong>${p.nome}</strong></td>
                            <td>R$ ${parseFloat(p.preco_venda || 0).toFixed(2)}</td>
                            <td><small>${p.composicao_detalhada || 'Sem ingredientes'}</small></td>
                            <td class="text-center">
                                <button class="btn btn-sm btn-info" onclick="prepararEdicao(${p.id})">Editar</button>
                            </td>
                        </tr>`;
                });
            }
        } catch (err) {
            console.error('Erro ao carregar produtos:', err);
        }
    }
}

// ============================================================
// FORMULÁRIOS
// ============================================================

function configurarFormularios() {
    configurarFormIngrediente();
    configurarFormProduto();
    configurarFormMovimentacao();
}

function configurarFormIngrediente() {
    const form = document.getElementById('formIngrediente');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = {
            nome:          document.getElementById('nomeItem').value,
            unidade_medida: document.getElementById('unidadeItem').value,
        };

        const res = await fetch(`${API_URL}/itens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
        });

        if (res.ok) {
            mostrarNotificacao('Ingrediente salvo com sucesso!');
            form.reset();
            await carregarDadosBase();
            atualizarInterface();
        }
    });
}

function configurarFormProduto() {
    const form = document.getElementById('formProduto');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const idEdicao = document.getElementById('idProdutoEdicao').value;

        const ingredientes = [];
        document.querySelectorAll('.linha-ingrediente').forEach(linha => {
            const item_id             = linha.querySelector('.select-item-id').value;
            const quantidade_necessaria = linha.querySelector('.qtd-item').value;
            if (item_id && quantidade_necessaria) {
                ingredientes.push({
                    item_id: parseInt(item_id),
                    quantidade_necessaria: parseFloat(quantidade_necessaria),
                });
            }
        });

        const dados = {
            nome:        document.getElementById('nomeProd').value,
            preco_venda: parseFloat(document.getElementById('precoProd').value.toString().replace(',', '.')) || 0,
            ingredientes,
        };

        const metodo = idEdicao ? 'PUT' : 'POST';
        const url    = idEdicao ? `${API_URL}/produtos/${idEdicao}` : `${API_URL}/produtos`;

        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
        });

        if (res.ok) {
            mostrarNotificacao(idEdicao ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
            resetarFormularioProduto();
            atualizarInterface();
        } else {
            mostrarNotificacao('Erro ao salvar produto. Tente novamente.', 'error');
        }
    });
}

function configurarFormMovimentacao() {
    const form = document.getElementById('formMovimentacao');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id       = document.getElementById('selectIngrediente').value;
        const tipo     = document.getElementById('tipoMovimentacao').value;
        const quantidade = parseFloat(document.getElementById('qtdMov').value);

        if (!id) return mostrarNotificacao('Selecione um ingrediente antes de continuar.', 'warning');

        const res = await fetch(`${API_URL}/itens/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantidade, tipo }),
        });

        if (res.ok) {
            mostrarNotificacao('Estoque atualizado com sucesso!');
            form.reset();
            await carregarDadosBase();
            atualizarInterface();
        } else {
            mostrarNotificacao('Erro ao atualizar estoque. Tente novamente.', 'error');
        }
    });
}

// ============================================================
// COMPOSIÇÃO DINÂMICA DE PRODUTO (cadastro.html)
// ============================================================

function adicionarLinhaIngrediente(idItem = '', quantidade = '') {
    const container = document.getElementById('containerIngredientesDinamicos');
    if (!container) return;

    const options = listaIngredientesGlobal.map(item =>
        `<option value="${item.id}" ${item.id == idItem ? 'selected' : ''}>${item.nome} (${item.unidade_medida})</option>`
    ).join('');

    const linha = document.createElement('div');
    linha.className = 'row g-2 mb-2 linha-ingrediente';
    linha.innerHTML = `
        <div class="col-md-7">
            <select class="form-select select-item-id" required>
                <option value="">Selecione o item...</option>
                ${options}
            </select>
        </div>
        <div class="col-md-3">
            <input type="number" class="form-control qtd-item" placeholder="Qtd" step="0.001" value="${quantidade}" required>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-outline-danger w-100" onclick="this.closest('.row').remove()">x</button>
        </div>`;
    container.appendChild(linha);
}

async function prepararEdicao(id) {
    try {
        const res = await fetch(`${API_URL}/produtos/${id}`);
        const produto = await res.json();

        document.getElementById('idProdutoEdicao').value = produto.id;
        document.getElementById('nomeProd').value        = produto.nome;
        document.getElementById('precoProd').value       = produto.preco_venda;
        document.getElementById('tituloFormProduto').innerText  = 'Editando: ' + produto.nome;
        document.getElementById('btnCancelarEdicao').style.display = 'block';

        const container = document.getElementById('containerIngredientesDinamicos');
        if (container) {
            container.innerHTML = '';
            (produto.itens || []).forEach(item => {
                adicionarLinhaIngrediente(item.item_id, item.quantidade_necessaria);
            });
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error('Erro ao preparar edição:', err);
    }
}

function resetarFormularioProduto() {
    const form = document.getElementById('formProduto');
    if (!form) return;

    form.reset();
    document.getElementById('idProdutoEdicao').value = '';
    document.getElementById('containerIngredientesDinamicos').innerHTML = '';
    document.getElementById('tituloFormProduto').innerText = 'Cadastrar Produto Completo';
    document.getElementById('btnCancelarEdicao').style.display = 'none';
}

// ============================================================
// DASHBOARD (index.html)
// ============================================================

function carregarPrevisaoNoDash() {
    const container = document.getElementById('secao-resumo-ia');
    if (!container) return;

    const salvo = localStorage.getItem('ultimaPrevisao');
    if (!salvo) return;

    const dados = JSON.parse(salvo);
    const hoje  = new Date().toLocaleDateString('pt-BR');
    if (dados.dataGravada !== hoje) return;

    container.style.display = 'flex';
    document.getElementById('dash-faturamento-ia').innerText = `R$ ${dados.faturamento_total.toFixed(2)}`;
    document.getElementById('dash-lanches-ia').innerText     = dados.qtd_lanches;
    document.getElementById('dash-delivery-ia').innerText    = parseInt(dados.pedidos_delivery);
    document.getElementById('dash-presencial-ia').innerText  = parseInt(dados.pedidos_presenciais);
}

async function inicializarDashboard() {
    try {
        const res   = await fetch(`${API_URL}/itens`);
        const itens = await res.json();
        atualizarCards(itens);
        preencherTabelaResumo(itens);
    } catch (err) {
        console.error('Erro no dashboard:', err);
    }
}

function atualizarCards(itens) {
    const elTotal   = document.getElementById('card-total-itens');
    const elAlertas = document.getElementById('card-alertas');
    if (!elTotal) return;

    elTotal.textContent   = itens.length;
    elAlertas.textContent = itens.filter(i => (i.quantidade_estoque || 0) < 5).length;
}

function preencherTabelaResumo(itens) {
    const tabela = document.getElementById('tabela-resumo');
    if (!tabela) return;

    tabela.innerHTML = '';
    itens.forEach(item => {
        const qtd = item.quantidade_estoque || 0;
        const badge = qtd <= 0
            ? '<span class="badge bg-danger">Esgotado</span>'
            : qtd < 10
                ? '<span class="badge bg-warning text-dark">Baixo</span>'
                : '<span class="badge bg-success">Ok</span>';

        tabela.innerHTML += `
            <tr>
                <td><strong>${item.nome}</strong></td>
                <td>${qtd}</td>
                <td>${item.unidade_medida}</td>
                <td>${badge}</td>
            </tr>`;
    });
}
