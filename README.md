# HamburguerIA

Sistema completo de gestão para hamburgueria com **previsão inteligente de vendas** usando Machine Learning.

Gerencia ingredientes, produtos e estoque, e usa um modelo de Random Forest treinado com dados históricos para prever faturamento, pedidos e mix de produtos com base no clima, dia da semana e outros fatores do dia.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Como rodar localmente](#como-rodar-localmente)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Banco de dados](#banco-de-dados)
- [API do Backend](#api-do-backend)
- [Serviço de IA](#serviço-de-ia)
- [Páginas do frontend](#páginas-do-frontend)

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                          │
│   index.html  cadastro.html  estoque.html  ia.html  │
│                   script.js / ia-script.js          │
└────────────────┬────────────────────┬───────────────┘
                 │ HTTP (porta 3000)  │ HTTP (porta 5000)
                 ▼                   ▼
    ┌────────────────────┐  ┌──────────────────────┐
    │  Backend Node.js   │  │  IA Service (Flask)  │
    │    Express + pg    │  │  Random Forest Model │
    └─────────┬──────────┘  └──────────────────────┘
              │ SQL (porta 5433)
              ▼
    ┌──────────────────────┐
    │  PostgreSQL (Docker) │
    │  banco de dados      │
    └──────────────────────┘
```

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, Bootstrap 5.3, JavaScript (Vanilla) |
| Backend | Node.js, Express 5, pg (PostgreSQL client) |
| Banco de dados | PostgreSQL 16 (via Docker) |
| IA | Python 3.11, scikit-learn, Flask, pandas, numpy |
| Infra | Docker, Docker Compose, nodemon |

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Anaconda](https://www.anaconda.com/) ou [Miniconda](https://docs.conda.io/en/latest/miniconda.html)
- Extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) no VS Code (para o frontend)

---

## Como rodar localmente

### 1. Banco de dados (Docker)

Com o **Docker Desktop aberto**, execute na raiz do projeto:

```bash
docker compose up -d
```

Isso sobe um container PostgreSQL na porta `5433` com as tabelas já criadas automaticamente pelo `banco/init.sql`.

> Para parar: `docker compose down`  
> Para apagar os dados e recomeçar do zero: `docker compose down -v`

---

### 2. Backend Node.js

```bash
cd backend
npm install       # só na primeira vez
npm run dev       # inicia com hot-reload (nodemon)
```

O servidor sobe em `http://localhost:3000`.

**Variáveis de ambiente** — crie `backend/.env` (já incluído, mas nunca suba no git):

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=postgres
DB_PASSWORD=guarani1978
DB_PORT=5433
PORT=3000
```

---

### 3. Serviço de IA (Flask)

#### Criação do ambiente (só na primeira vez)

```bash
conda create -n ia-hamburgueria python=3.11 -y
cd ia-service
conda run -n ia-hamburgueria pip install -r requirements.txt
```

#### Geração do dataset e treino do modelo (só na primeira vez ou para retreinar)

```bash
cd ia-service

# Gera ~2200 linhas de dados sintéticos realistas
conda run -n ia-hamburgueria python gerar_dataset.py

# Treina o modelo e salva modelo_hamburgueria.pkl
conda run -n ia-hamburgueria python ia.py
```

#### Iniciar a API

```bash
cd ia-service
.\iniciar_ia.ps1
```

Ou manualmente:

```bash
& "C:\Users\USER\Anaconda3\envs\ia-hamburgueria\python.exe" ia_api.py
```

A API sobe em `http://localhost:5000`.

---

### 4. Frontend

Abra `frontend/index.html` com o **Live Server** do VS Code (clique direito → *Open with Live Server*).

---

### Resumo dos terminais

| # | O que roda | Comando |
|---|---|---|
| 1 | Banco | `docker compose up -d` (uma vez) |
| 2 | Backend | `cd backend && npm run dev` |
| 3 | IA | `cd ia-service && .\iniciar_ia.ps1` |
| 4 | Frontend | Live Server no VS Code |

---

## Estrutura de pastas

```
PI5/
├── docker-compose.yml          # Sobe o PostgreSQL em container
├── .gitignore
│
├── banco/
│   └── init.sql                # Cria as tabelas automaticamente no primeiro start
│
├── backend/
│   ├── server.js               # API REST em Express (todas as rotas)
│   ├── package.json
│   ├── .env                    # Credenciais do banco (não vai pro git)
│   └── .env.example            # Template de configuração
│
├── frontend/
│   ├── index.html              # Dashboard com resumo e previsão IA do dia
│   ├── cadastro.html           # Cadastro de ingredientes e produtos com composição
│   ├── estoque.html            # Lançamento de entradas e saídas de estoque
│   ├── ia.html                 # Simulação de previsão por condições do dia
│   ├── script.js               # JavaScript compartilhado entre as páginas
│   └── ia-script.js            # JavaScript exclusivo da página de IA
│
└── ia-service/
    ├── gerar_dataset.py        # Gera dataset_vendas.csv com dados sintéticos
    ├── ia.py                   # Treina o modelo e salva modelo_hamburgueria.pkl
    ├── ia_api.py               # API Flask que serve as previsões
    ├── dataset_vendas.csv      # Dataset de 2.192 dias (2019–2024)
    ├── modelo_hamburgueria.pkl # Modelo treinado (gerado pelo ia.py)
    ├── requirements.txt        # Dependências Python
    └── iniciar_ia.ps1          # Atalho PowerShell para iniciar a API
```

---

## Banco de dados

### Diagrama

```
itens ──────────────────── composicao_produto ──── produtos
 id (PK)                    id (PK)                 id (PK)
 nome                       produto_id (FK)         nome
 unidade_medida             item_id (FK)            preco_venda
 quantidade_estoque         quantidade_necessaria   composicao (texto)

vendas
 id (PK)
 produto_id (FK)
 quantidade_vendida
 data_venda
```

### Tabelas

**`itens`** — ingredientes cadastrados no estoque

| Coluna | Tipo | Descrição |
|---|---|---|
| id | SERIAL PK | |
| nome | VARCHAR(100) | Nome do ingrediente |
| unidade_medida | VARCHAR(10) | `un`, `kg` ou `g` |
| quantidade_estoque | NUMERIC(10,3) | Saldo atual |

**`produtos`** — cardápio

| Coluna | Tipo | Descrição |
|---|---|---|
| id | SERIAL PK | |
| nome | VARCHAR(100) | Nome do produto |
| preco_venda | NUMERIC(10,2) | Preço de venda |

**`composicao_produto`** — ficha técnica (qual ingrediente e quanto cada produto usa)

| Coluna | Tipo | Descrição |
|---|---|---|
| produto_id | FK → produtos | |
| item_id | FK → itens | |
| quantidade_necessaria | NUMERIC(10,3) | Qtd necessária por unidade |

**`vendas`** — histórico de vendas

| Coluna | Tipo | Descrição |
|---|---|---|
| produto_id | FK → produtos | |
| quantidade_vendida | NUMERIC(10,3) | |
| data_venda | TIMESTAMP | Default: now() |

---

## API do Backend

Base URL: `http://localhost:3000`

### Ingredientes

| Método | Rota | Descrição | Body |
|---|---|---|---|
| GET | `/itens` | Lista todos os ingredientes | — |
| POST | `/itens` | Cadastra ingrediente | `{ nome, unidade_medida }` |
| PATCH | `/itens/:id` | Atualiza estoque | `{ quantidade, tipo }` ¹ |

¹ `tipo`: `"entrada"` (soma) ou `"saida"` (subtrai)

### Produtos

| Método | Rota | Descrição | Body |
|---|---|---|---|
| GET | `/produtos` | Lista produtos com composição | — |
| GET | `/produtos/:id` | Busca produto com ingredientes | — |
| POST | `/produtos` | Cadastra produto | `{ nome, preco_venda, ingredientes[] }` |
| PUT | `/produtos/:id` | Atualiza produto | `{ nome, preco_venda, ingredientes[] }` |

O campo `ingredientes` é um array:
```json
[
  { "item_id": 1, "quantidade_necessaria": 2 },
  { "item_id": 3, "quantidade_necessaria": 0.15 }
]
```

### Composição avulsa

| Método | Rota | Descrição |
|---|---|---|
| POST | `/composicao` | Adiciona item à composição de um produto |

---

## Serviço de IA

Base URL: `http://localhost:5000`

### `POST /prever_tudo`

Recebe as condições do dia e retorna previsões de vendas.

**Request:**
```json
{
  "dia_da_semana": 5,
  "mês": 6,
  "dia_do_mes": 12,
  "epoca_pagamento": 0,
  "feriado": 0,
  "promoção_ativa": 1,
  "final_de_semana": 0,
  "data_comemorativa": 1,
  "condição_climática": 3,
  "intensidade_chuva": 0
}
```

| Campo | Valores |
|---|---|
| `dia_da_semana` | 1=seg … 7=dom |
| `condição_climática` | 0=temporal, 1=chuvoso, 2=nublado, 3=ensolarado |
| `intensidade_chuva` | 0=nenhuma, 1=fraca, 2=forte |
| Demais booleanos | 0 ou 1 |

**Response:**
```json
{
  "faturamento_total": 8432.50,
  "pedidos_presenciais": 68,
  "pedidos_delivery": 45,
  "qtd_lanches": 98,
  "qtd_combos": 58,
  "qtd_batatas": 47,
  "qtd_bebidas": 82,
  "qtd_sobremesas": 24
}
```

### Como o modelo funciona

O modelo é um **Random Forest Regressor** com 300 árvores de decisão, treinado em 2.192 dias de dados sintéticos (2019–2024) gerados pelo `gerar_dataset.py`.

**Features usadas:**

| Feature | Por quê importa |
|---|---|
| `dia_da_semana` + sin/cos | Sábado vende ~2x mais que segunda; sin/cos faz o modelo entender que dom→seg é contínuo |
| `mês` + sin/cos | Sazonalidade: dezembro e verão faturam mais |
| `semana_do_mes`, `epoca_pagamento`, `fim_mes` | Pulsos de vendas logo após o pagamento (dias 1-7) e fechamento de mês |
| `condição_climática`, `intensidade_chuva` | Chuva reduz presencial e aumenta delivery |
| `fator_chuva` | Interação: intensidade só conta quando o clima é realmente ruim |
| `promoção_ativa`, `promo_fds` | Promoção em fim de semana tem impacto maior que em dia útil |
| `feriado`, `data_comemorativa` | Eventos especiais elevam o movimento |

**Performance atual:**

| Alvo | Precisão R² | Erro médio |
|---|---|---|
| Faturamento total | ~89% | ±R$ 500/dia |
| Lanches | ~90% | ±7 unid./dia |
| Presencial | ~88% | ±5 pedidos/dia |
| Delivery | ~86% | ±4 pedidos/dia |

---

## Páginas do frontend

### Dashboard (`index.html`)
Visão geral do sistema. Mostra total de itens em estoque, alertas de baixo estoque e — se uma previsão foi gerada hoje — exibe o resumo da IA no topo.

### Cadastros (`cadastro.html`)
- Cadastro de ingredientes (nome + unidade de medida)
- Cadastro de produtos com composição dinâmica: selecione cada ingrediente e a quantidade necessária por unidade produzida
- Lista de produtos com botão de edição inline

### Estoque (`estoque.html`)
Lança entradas e saídas de ingredientes. A tabela ao lado mostra o saldo atual de todos os itens em tempo real.

### Previsões com IA (`ia.html`)
Preencha as condições do dia (clima, promoção, etc.) e a IA retorna a previsão de faturamento, pedidos e mix de produtos. O resultado é salvo no `localStorage` e aparece automaticamente no Dashboard enquanto for do dia corrente.
