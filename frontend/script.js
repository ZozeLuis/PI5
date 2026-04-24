const API_URL = "http://localhost:3000";

// 1. Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Sistema de Cadastro Iniciado");
    atualizarInterface();
    configurarFormularios();
    if (document.getElementById('tabela-resumo')) {
        inicializarDashboard();
    }
});

async function atualizarInterface() {
    const selectProd = document.getElementById('selectProduto');
    const selectIng = document.getElementById('selectIngrediente') || document.getElementById('selectEstoqueItem');
    const tabelaSaldo = document.getElementById('tabela-saldo-real');

    try {
        // --- BUSCAR INGREDIENTES/ITENS ---
        const resItens = await fetch(`${API_URL}/itens`);
        if (!resItens.ok) throw new Error("Erro ao buscar itens");
        const itens = await resItens.json();

        // Popula o Select de Ingredientes (seja no cadastro ou no estoque)
        if (selectIng) {
            selectIng.innerHTML = '<option value="">Selecione o ingrediente...</option>';
            itens.forEach(item => {
                selectIng.innerHTML += `<option value="${item.id}">${item.nome} (${item.unidade_medida})</option>`;
            });
            console.log("✅ Select de Ingredientes carregado");
        }

        // Popula a Tabela de Saldo (Estoque)
        if (tabelaSaldo) {
            tabelaSaldo.innerHTML = ''; 
            itens.forEach(item => {
                tabelaSaldo.innerHTML += `
                    <tr>
                        <td><strong>${item.nome}</strong></td>
                        <td>${item.quantidade_estoque || 0}</td>
                        <td>${item.unidade_medida}</td>
                    </tr>
                `;
            });
            console.log("✅ Tabela de Saldo carregada");
        }

        // --- BUSCAR PRODUTOS ---
        const resProd = await fetch(`${API_URL}/produtos`);
        if (!resProd.ok) throw new Error("Erro ao buscar produtos");
        const produtos = await resProd.json();

        if (selectProd) {
            selectProd.innerHTML = '<option value="">Selecione o produto...</option>';
            produtos.forEach(p => {
                selectProd.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
            });
            console.log("✅ Select de Produtos carregado");
        }

    } catch (err) {
        console.error("❌ Erro fatal:", err);
    }
}

// 3. Configura os 3 formulários da página
function configurarFormularios() {
    
    // FORM 1: Cadastrar Novo Ingrediente
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
                atualizarInterface(); // Atualiza o select de composição na hora
            }
        });
    }

    // FORM 2: Cadastrar Novo Produto (Lanche)
    const formProduto = document.getElementById('formProduto');
    if (formProduto) {
        formProduto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dados = {
                nome: document.getElementById('nomeProd').value,
                preco: document.getElementById('precoProd').value
            };
            const res = await fetch(`${API_URL}/produtos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            if (res.ok) {
                alert("Produto cadastrado no cardápio!");
                formProduto.reset();
                atualizarInterface(); // Atualiza o select de composição na hora
            }
        });
    }

    // FORM 3: Montar Composição (Vincular os dois)
    const formComp = document.getElementById('formComposicao');
    if (formComp) {
        formComp.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dados = {
                produto_id: document.getElementById('selectProduto').value,
                item_id: document.getElementById('selectIngrediente').value,
                quantidade_necessaria: document.getElementById('qtdNecessaria').value
            };

            if (!dados.produto_id || !dados.item_id) {
                alert("Selecione um Produto e um Ingrediente!");
                return;
            }

            const res = await fetch(`${API_URL}/composicoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (res.ok) {
                alert("✅ Ingrediente vinculado ao lanche com sucesso!");
                formComp.reset();
            } else {
                alert("Erro ao vincular composição.");
            }
        });
    }
}   

async function inicializarDashboard() {
    try {
        const res = await fetch(`${API_URL}/itens`);
        const itens = await res.json();

        atualizarCards(itens);
        preencherTabelaResumo(itens);
        gerarInsightIA(itens);

    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
    }
}

// 1. Atualiza os números grandes nos Cards
function atualizarCards(itens) {
    const totalItens = itens.length;
    // Consideramos "alerta" itens com menos de 5 unidades no estoque
    const alertas = itens.filter(item => (item.quantidade_estoque || 0) < 5).length;

    document.getElementById('card-total-itens').textContent = totalItens;
    document.getElementById('card-alertas').textContent = alertas;
    
    // Estilo visual para o card de alertas se houver problemas
    const cardAlerta = document.getElementById('card-alertas').parentElement;
    if (alertas > 0) {
        cardAlerta.classList.replace('bg-warning', 'bg-danger');
        cardAlerta.classList.add('text-white');
    }
}

// 2. Preenche a tabela central do Dashboard
function preencherTabelaResumo(itens) {
    const tabela = document.getElementById('tabela-resumo');
    tabela.innerHTML = '';

    itens.forEach(item => {
        const qtd = item.quantidade_estoque || 0;
        let statusBadge = '';

        // Lógica de Status
        if (qtd <= 0) {
            statusBadge = '<span class="badge bg-danger">Esgotado</span>';
        } else if (qtd < 10) {
            statusBadge = '<span class="badge bg-warning text-dark">Baixo</span>';
        } else {
            statusBadge = '<span class="badge bg-success">Ok</span>';
        }

        tabela.innerHTML += `
            <tr>
                <td><strong>${item.nome}</strong></td>
                <td>${qtd}</td>
                <td>${item.unidade_medida}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });
}
