const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

// Configurações para o servidor entender JSON e permitir que o Live Server acesse o Backend
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
const pool = new Pool({
    user: 'postgres',       // Usuário padrão do Postgres
    host: 'localhost',      // Seu computador
    database: 'postgres', // Nome do banco que você criou no DBeaver
    password: 'guarani1978', // !!! COLOQUE SUA SENHA DO POSTGRES AQUI !!!
    port: 5432,             // Porta padrão
});

// Testar a conexão com o banco logo ao iniciar
pool.connect((err) => {
    if (err) {
        console.error('❌ Erro ao conectar no Postgres:', err.stack);
    } else {
        console.log('✅ Conectado ao banco de dados PostgreSQL!');
    }
});

// --- ROTAS PARA INGREDIENTES (ITENS) ---

// Listar todos os ingredientes
app.get('/itens', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM itens ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cadastrar novo ingrediente
app.post('/itens', async (req, res) => {
    const { nome, unidade_medida } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO itens (nome, unidade_medida) VALUES ($1, $2) RETURNING *',
            [nome, unidade_medida]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROTAS PARA PRODUTOS (CARDÁPIO) ---

// Listar todos os produtos
app.get('/produtos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM produtos ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cadastrar novo produto no cardápio
app.post('/produtos', async (req, res) => {
    const { nome, preco_venda } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO produtos (nome, preco_venda) VALUES ($1, $2) RETURNING *',
            [nome, preco_venda]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROTAS PARA COMPOSIÇÃO (FICHA TÉCNICA) ---

app.post('/composicao', async (req, res) => {
    const { produto_id, item_id, quantidade_necessaria } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO composicao_produto (produto_id, item_id, quantidade_necessaria) VALUES ($1, $2, $3) RETURNING *',
            [produto_id, item_id, quantidade_necessaria]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

// Rota para atualizar a quantidade de um item no estoque
app.patch('/itens/:id', async (req, res) => {
    const { id } = req.params;
    const { quantidade, tipo } = req.body; // tipo: 'entrada' ou 'saida'

    try {
        let query;
        if (tipo === 'entrada') {
            query = 'UPDATE itens SET quantidade_estoque = quantidade_estoque + $1 WHERE id = $2 RETURNING *';
        } else {
            query = 'UPDATE itens SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2 RETURNING *';
        }

        const result = await pool.query(query, [quantidade, id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});