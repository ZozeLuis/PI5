const API_URL = "http://localhost:3000";
let listaIngredientesGlobal = []; 

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Sistema HamburgueriaIA Iniciado");
    
    await carregarDadosBase();
    atualizarInterface();
    configurarFormularios();
    carregarPrevisaoNoDash();
    if (document.getElementById('tabela-resumo')) {
        inicializarDashboard();
    }
});

function carregarPrevisaoNoDash() {
    const previsaoSalva = localStorage.getItem('ultimaPrevisao');
    const container = document.getElementById('secao-resumo-ia');

    if (previsaoSalva && container) {
        const dados = JSON.parse(previsaoSalva);
        const hoje = new Date().toLocaleDateString('pt-BR');
        if (dados.dataGravada === hoje) {
            container.style.display = 'flex'; 

            document.getElementById('dash-faturamento-ia').innerText = `R$ ${dados.faturamento_total.toFixed(2)}`;
            document.getElementById('dash-lanches-ia').innerText = dados.qtd_lanches;
            document.getElementById('dash-delivery-ia').innerText = parseInt(dados.pedidos_delivery);
            document.getElementById('dash-presencial-ia').innerText = parseInt(dados.pedidos_presenciais);
        }
    }
}

async function carregarDadosBase() {
    try {
        const res = await fetch(`${API_URL}/itens`);
        listaIngredientesGlobal = await res.json();
    } catch (err) {
        console.error("Erro ao carregar lista de ingredientes:", err);
    }
}

async function atualizarInterface() {
    const selectProdComposicao = document.getElementById('selectProduto');
    const tabelaProdutos = document.getElementById('tabelaProdutosCorpo');
    const selectIng = document.getElementById('selectIngrediente') || document.getElementById('selectEstoqueItem');
    const tabelaSaldo = document.getElementById('tabela-saldo-real');

    try {
        if (selectIng) {
            selectIng.innerHTML = '<option value="">Selecione o ingrediente...</option>';
            listaIngredientesGlobal.forEach(item => {
                selectIng.innerHTML += `<option value="${item.id}">${item.nome} (${item.unidade_medida})</option>`;
            });
        }

        if (tabelaSaldo) {
            tabelaSaldo.innerHTML = ''; 
            listaIngredientesGlobal.forEach(item => {
                tabelaSaldo.innerHTML += `
                    <tr>
                        <td><strong>${item.nome}</strong></td>
                        <td>${item.quantidade_estoque || 0}</td>
                        <td>${item.unidade_medida}</td>
                    </tr>
                `;
            });
        }

        if (selectProdComposicao || tabelaProdutos) {
            const resProd = await fetch(`${API_URL}/produtos`);
            const produtos = await resProd.json();

            if (selectProdComposicao) {
                selectProdComposicao.innerHTML = '<option value="">Selecione o produto...</option>';
                produtos.forEach(p => {
                    selectProdComposicao.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
                });
            }

            if (tabelaProdutos) {
                tabelaProdutos.innerHTML = '';
                produtos.forEach(p => {
                    tabelaProdutos.innerHTML += `
                        <tr>
                            <td><strong>${p.nome}</strong></td>
                            <td>R$ ${parseFloat(p.preco_venda || 0).toFixed(2)}</td>
                            <td><small>${p.composicao || 'Sem ingredientes'}</small></td>
                            <td class="text-center">
                                <button class="btn btn-sm btn-info" onclick="prepararEdicao(${p.id})">Editar</button>
                            </td>
                        </tr>
                    `;
                });
            }
        }
    } catch (err) {
        console.error("❌ Erro ao atualizar interface:", err);
    }
}

function adicionarLinhaIngrediente(idItem = '', quantidade = '') {
    const container = document.getElementById('containerIngredientesDinamicos');
    if (!container) return;

    const divLinha = document.createElement('div');
    divLinha.className = 'row g-2 mb-2 linha-ingrediente';

    const options = listaIngredientesGlobal.map(item => 
        `<option value="${item.id}" ${item.id == idItem ? 'selected' : ''}>${item.nome} (${item.unidade_medida})</option>`
    ).join('');

    divLinha.innerHTML = `
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
        </div>
    `;
    container.appendChild(divLinha);
}

function configurarFormularios() {
    const formIngrediente = document.getElementById('formIngrediente');
    if (formIngrediente) {
        formIngrediente.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dados = {
                nome: document.getElementById('nomeItem').value,
                unidade_medida: document.getElementById('unidadeItem').value
            };
            const res = await fetch(`${API_URL}/itens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            if (res.ok) {
                alert("Ingrediente Salvo!");
                formIngrediente.reset();
                await carregarDadosBase();
                atualizarInterface();
            }
        });
    }

    const formProduto = document.getElementById('formProduto');
    if (formProduto) {
        formProduto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idEdicao = document.getElementById('idProdutoEdicao').value;
            
            const ingredientes = [];
            document.querySelectorAll('.linha-ingrediente').forEach(linha => {
                const item_id = linha.querySelector('.select-item-id').value;
                const quantidade_necessaria = linha.querySelector('.qtd-item').value;
                
                if(item_id && quantidade_necessaria) {
                    ingredientes.push({
                        item_id: parseInt(item_id),
                        quantidade_necessaria: parseFloat(quantidade_necessaria) 
                    });
                }
            });

            const dados = {
                nome: document.getElementById('nomeProd').value,
                preco_venda: parseFloat(document.getElementById('precoProd').value.toString().replace(',', '.')) || 0,
                ingredientes: ingredientes 
            };

            const metodo = idEdicao ? 'PUT' : 'POST';
            const url = idEdicao ? `${API_URL}/produtos/${idEdicao}` : `${API_URL}/produtos`;

            const res = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (res.ok) {
                alert(idEdicao ? "Produto atualizado!" : "Produto cadastrado!");
                resetarFormularioProduto();
                atualizarInterface();
            } else {
                alert("Erro ao salvar produto.");
            }
        });
    }
}

async function prepararEdicao(id) {
    try {
        const res = await fetch(`${API_URL}/produtos/${id}`);
        const produto = await res.json();

        document.getElementById('idProdutoEdicao').value = produto.id;
        document.getElementById('nomeProd').value = produto.nome;
        document.getElementById('precoProd').value = produto.preco_venda;
        
        document.getElementById('tituloFormProduto').innerText = "Editando: " + produto.nome;
        document.getElementById('btnCancelarEdicao').style.display = 'block';

        const container = document.getElementById('containerIngredientesDinamicos');
        if (container) {
            container.innerHTML = '';
            if (produto.itens) {
                produto.itens.forEach(item => {
                    adicionarLinhaIngrediente(item.item_id, item.quantidade_necessaria);
                });
            }
        }
    } catch (err) { console.error("Erro ao preparar edição", err); }
}

function resetarFormularioProduto() {
    const form = document.getElementById('formProduto');
    if (form) {
        form.reset();
        document.getElementById('idProdutoEdicao').value = '';
        const container = document.getElementById('containerIngredientesDinamicos');
        if (container) container.innerHTML = '';
        document.getElementById('tituloFormProduto').innerText = "Cadastrar Produto Completo";
        document.getElementById('btnCancelarEdicao').style.display = 'none';
    }
}

async function inicializarDashboard() {
    try {
        const res = await fetch(`${API_URL}/itens`);
        const itens = await res.json();
        atualizarCards(itens);
        preencherTabelaResumo(itens);
    } catch (err) { console.error("Erro dashboard:", err); }
}

function atualizarCards(itens) {
    const totalItens = itens.length;
    const alertas = itens.filter(item => (item.quantidade_estoque || 0) < 5).length;
    if (document.getElementById('card-total-itens')) {
        document.getElementById('card-total-itens').textContent = totalItens;
        document.getElementById('card-alertas').textContent = alertas;
    }
}

function preencherTabelaResumo(itens) {
    const tabela = document.getElementById('tabela-resumo');
    if (!tabela) return;
    tabela.innerHTML = '';
    itens.forEach(item => {
        const qtd = item.quantidade_estoque || 0;
        let statusBadge = qtd <= 0 ? '<span class="badge bg-danger">Esgotado</span>' : 
                          qtd < 10 ? '<span class="badge bg-warning text-dark">Baixo</span>' : 
                          '<span class="badge bg-success">Ok</span>';
        tabela.innerHTML += `<tr><td><strong>${item.nome}</strong></td><td>${qtd}</td><td>${item.unidade_medida}</td><td>${statusBadge}</td></tr>`;
    });
}