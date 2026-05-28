<<<<<<< HEAD
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
=======
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors    = require('cors');
const morgan  = require('morgan');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan(':method :url :status :res[content-length]b — :response-time ms'));

// ============================================================
// BANCO DE DADOS
// ============================================================

const pool = new Pool({
    user:     process.env.DB_USER,
    host:     process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port:     parseInt(process.env.DB_PORT || '5432'),
});

pool.connect((err) => {
    if (err) console.error('❌ Erro ao conectar no Postgres:', err.stack);
    else     console.log('✅ Conectado ao banco de dados PostgreSQL!');
});

// ============================================================
// INGREDIENTES (itens)
// ============================================================

>>>>>>> colleague-main
app.get('/itens', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM itens ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

<<<<<<< HEAD
// Cadastrar novo ingrediente
=======
>>>>>>> colleague-main
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

<<<<<<< HEAD
// --- ROTAS PARA PRODUTOS (CARDÁPIO) ---

// Listar todos os produtos
    user:     process.env.DB_USER || 'postgres',
    host:     process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'guarani1978',
    port:     parseInt(process.env.DB_PORT || '5432'),
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
=======
app.patch('/itens/:id', async (req, res) => {
    const { id } = req.params;
    const { quantidade, tipo } = req.body;
    try {
        const operacao = tipo === 'entrada' ? '+' : '-';
        const result = await pool.query(
            `UPDATE itens SET quantidade_estoque = quantidade_estoque ${operacao} $1 WHERE id = $2 RETURNING *`,
            [quantidade, id]
>>>>>>> colleague-main
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

<<<<<<< HEAD
// --- ROTAS PARA COMPOSIÇÃO (FICHA TÉCNICA) ---
=======
// ============================================================
// PRODUTOS
// ============================================================

app.get('/produtos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*,
                   string_agg(i.nome || ' x' || cp.quantidade_necessaria, ', ' ORDER BY i.nome) AS composicao_detalhada
            FROM produtos p
            LEFT JOIN composicao_produto cp ON cp.produto_id = p.id
            LEFT JOIN itens i ON i.id = cp.item_id
            GROUP BY p.id
            ORDER BY p.nome ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/produtos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const prodResult = await pool.query('SELECT * FROM produtos WHERE id = $1', [id]);
        if (prodResult.rows.length === 0)
            return res.status(404).json({ error: 'Produto não encontrado' });

        const produto = prodResult.rows[0];
        const compResult = await pool.query(
            `SELECT cp.item_id, cp.quantidade_necessaria, i.nome, i.unidade_medida
             FROM composicao_produto cp
             JOIN itens i ON cp.item_id = i.id
             WHERE cp.produto_id = $1`,
            [id]
        );
        produto.itens = compResult.rows;
        res.json(produto);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/produtos', async (req, res) => {
    const { nome, preco_venda, ingredientes } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO produtos (nome, preco_venda) VALUES ($1, $2) RETURNING *',
            [nome, preco_venda]
        );
        const produto = result.rows[0];

        if (ingredientes?.length > 0) {
            for (const ing of ingredientes) {
                await pool.query(
                    'INSERT INTO composicao_produto (produto_id, item_id, quantidade_necessaria) VALUES ($1, $2, $3)',
                    [produto.id, ing.item_id, ing.quantidade_necessaria]
                );
            }
        }

        res.json(produto);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, preco_venda, ingredientes } = req.body;
    try {
        const result = await pool.query(
            'UPDATE produtos SET nome = $1, preco_venda = $2 WHERE id = $3 RETURNING *',
            [nome, preco_venda, id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Produto não encontrado' });

        await pool.query('DELETE FROM composicao_produto WHERE produto_id = $1', [id]);

        if (ingredientes?.length > 0) {
            for (const ing of ingredientes) {
                await pool.query(
                    'INSERT INTO composicao_produto (produto_id, item_id, quantidade_necessaria) VALUES ($1, $2, $3)',
                    [id, ing.item_id, ing.quantidade_necessaria]
                );
            }
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// COMPOSIÇÃO (ficha técnica avulsa — mantido por compatibilidade)
// ============================================================
>>>>>>> colleague-main

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

<<<<<<< HEAD
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
=======
// ============================================================
// SERVIDOR
// ============================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
>>>>>>> colleague-main
