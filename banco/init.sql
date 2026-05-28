-- Ingredientes base do estoque
CREATE TABLE IF NOT EXISTS itens (
    id                 SERIAL PRIMARY KEY,
    nome               VARCHAR(100)   NOT NULL,
    unidade_medida     VARCHAR(10)    NOT NULL DEFAULT 'un',
    quantidade_estoque NUMERIC(10, 3) NOT NULL DEFAULT 0
);

-- Cardápio de produtos
CREATE TABLE IF NOT EXISTS produtos (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100)  NOT NULL,
    preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
    composicao  TEXT
);

-- Ficha técnica: quais ingredientes compõem cada produto
CREATE TABLE IF NOT EXISTS composicao_produto (
    id                   SERIAL PRIMARY KEY,
    produto_id           INTEGER        NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    item_id              INTEGER        NOT NULL REFERENCES itens(id)    ON DELETE CASCADE,
    quantidade_necessaria NUMERIC(10,3) NOT NULL
);

-- Registro de vendas
CREATE TABLE IF NOT EXISTS vendas (
    id                SERIAL PRIMARY KEY,
    produto_id        INTEGER        REFERENCES produtos(id) ON DELETE SET NULL,
    quantidade_vendida NUMERIC(10,3) NOT NULL,
    data_venda        TIMESTAMP      NOT NULL DEFAULT NOW()
);
