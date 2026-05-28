"""
Gera dataset sintético de vendas para uma hamburgueria.
Saída: dataset_vendas.csv (~2200 linhas, 2019-2024)

Padrões embutidos (para o modelo aprender):
  - Volume maior na sexta/sábado
  - Chuva reduz presencial e aumenta delivery
  - Promoção em FDS tem impacto maior que em dia útil
  - Pagamento nos dias 1-7 = pico de vendas
  - Dezembro e verão = mais faturamento
  - Feriados e datas comemorativas elevam o movimento
"""

import pandas as pd
import numpy as np
from datetime import date, timedelta
from tqdm import tqdm

np.random.seed(42)

# ============================================================
# PARÂMETROS BASE (hamburgueria de médio porte)
# ============================================================

BASE_PRESENCIAL = 50
BASE_DELIVERY   = 35

PRECO = {
    'lanche':    26.50,
    'combo':     40.00,
    'batata':    11.00,
    'bebida':     8.50,
    'sobremesa': 13.00,
}

# ============================================================
# FERIADOS E DATAS ESPECIAIS (mês, dia)
# ============================================================

FERIADOS = {
    (1, 1), (4, 21), (5, 1), (9, 7),
    (10, 12), (11, 2), (11, 15), (12, 25),
    # Carnaval (segunda e terça, aprox.)
    (2, 20), (2, 21), (3, 1), (3, 2),
}

DATAS_COMEMORATIVAS = {
    (2, 14),   # Dia dos Namorados (valentines BR)
    (5, 12),   # Dia das Mães (2º domingo de maio, aprox.)
    (6, 12),   # Dia dos Namorados (oficial BR)
    (8, 11),   # Dia dos Pais (3º domingo de agosto, aprox.)
    (10, 31),  # Halloween
    (12, 24),  # Véspera de Natal
    (12, 31),  # Réveillon
}

# ============================================================
# CLIMA POR MÊS (probabilidades: temporal, chuvoso, nublado, ensolarado)
# ============================================================

CLIMA_POR_MES = {
    1:  [0.12, 0.28, 0.30, 0.30],  # Janeiro  — verão chuvoso
    2:  [0.10, 0.25, 0.30, 0.35],
    3:  [0.08, 0.22, 0.32, 0.38],
    4:  [0.05, 0.15, 0.30, 0.50],  # Outono
    5:  [0.03, 0.12, 0.25, 0.60],
    6:  [0.02, 0.08, 0.20, 0.70],  # Inverno seco
    7:  [0.02, 0.07, 0.18, 0.73],
    8:  [0.02, 0.08, 0.20, 0.70],
    9:  [0.04, 0.12, 0.27, 0.57],  # Primavera
    10: [0.06, 0.18, 0.30, 0.46],
    11: [0.08, 0.22, 0.30, 0.40],
    12: [0.12, 0.26, 0.28, 0.34],  # Verão
}

def sortear_clima(mes: int):
    clima = int(np.random.choice(4, p=CLIMA_POR_MES[mes]))
    if   clima == 0: chuva = 2                                           # temporal → forte
    elif clima == 1: chuva = int(np.random.choice([1, 2], p=[.45, .55]))# chuvoso
    elif clima == 2: chuva = int(np.random.choice([0, 1], p=[.75, .25]))# nublado
    else:            chuva = 0                                           # ensolarado
    return clima, chuva

# ============================================================
# FATORES DE IMPACTO
# ============================================================

FATOR_DIA_SEMANA = {1: 0.68, 2: 0.73, 3: 0.79, 4: 0.87,
                     5: 1.18, 6: 1.48, 7: 1.22}

FATOR_MES = {1: 0.88, 2: 0.91, 3: 0.95, 4: 0.97,
              5: 1.00, 6: 1.00, 7: 1.06, 8: 1.02,
              9: 0.97, 10: 1.06, 11: 1.13, 12: 1.25}

# Impacto do clima em presencial e delivery
CLIMA_PRESENCIAL = {0: 0.40, 1: 0.65, 2: 0.88, 3: 1.00}
CLIMA_DELIVERY   = {0: 1.40, 1: 1.25, 2: 1.07, 3: 1.00}

# ============================================================
# CÁLCULO DOS ALVOS
# ============================================================

def calcular_vendas(dia_semana, mes, dia_do_mes, feriado,
                    promo, fds, data_comem, clima, chuva):

    # Período do mês
    if dia_do_mes <= 7:    f_pag = 1.25
    elif dia_do_mes <= 10: f_pag = 1.14
    elif dia_do_mes >= 25: f_pag = 1.07
    else:                  f_pag = 1.00

    f_base = (FATOR_DIA_SEMANA[dia_semana]
              * FATOR_MES[mes]
              * f_pag
              * (1.33 if promo else 1.0)
              * (1.10 if promo and fds else 1.0)  # promo+fds = super boost
              * (1.11 if feriado else 1.0)
              * (1.28 if data_comem else 1.0))

    noise = lambda: np.random.normal(1.0, 0.09)

    presencial = max(2, int(BASE_PRESENCIAL * f_base * CLIMA_PRESENCIAL[clima] * noise()))
    delivery   = max(1, int(BASE_DELIVERY   * f_base * CLIMA_DELIVERY[clima]   * noise()))
    total      = presencial + delivery

    def mix(media, std, lo, hi):
        return max(0, int(total * float(np.clip(np.random.normal(media, std), lo, hi))))

    lanches    = mix(0.88, 0.04, 0.72, 1.00)
    combos     = mix(0.52, 0.06, 0.35, 0.70)
    batatas    = mix(0.42, 0.06, 0.26, 0.60)
    bebidas    = mix(0.73, 0.05, 0.55, 0.90)
    sobremesas = mix(0.22, 0.05, 0.06, 0.38)

    faturamento = (lanches    * PRECO['lanche']
                 + combos     * PRECO['combo']
                 + batatas    * PRECO['batata']
                 + bebidas    * PRECO['bebida']
                 + sobremesas * PRECO['sobremesa']
                 ) * float(np.random.normal(1.0, 0.04))

    return presencial, delivery, round(faturamento, 2), lanches, combos, batatas, bebidas, sobremesas

# ============================================================
# GERAÇÃO DAS LINHAS
# ============================================================

inicio = date(2019, 1, 1)
fim    = date(2024, 12, 31)

datas       = [inicio + timedelta(days=i) for i in range((fim - inicio).days + 1)]
rows        = []
promo_ativa = False
dias_promo  = 0

for d in tqdm(datas, desc="📅 Gerando dataset", unit="dias"):
    dow = d.isoweekday()
    fds = 1 if dow >= 6 else 0

    if not promo_ativa:
        prob = 0.22 if fds else 0.10
        promo_ativa = bool(np.random.random() < prob)
        dias_promo  = int(np.random.choice([1, 2, 3], p=[0.5, 0.3, 0.2])) if promo_ativa else 0
    else:
        dias_promo -= 1
        promo_ativa = dias_promo > 0

    feriado    = 1 if (d.month, d.day) in FERIADOS            else 0
    data_comem = 1 if (d.month, d.day) in DATAS_COMEMORATIVAS else 0
    clima, chuva = sortear_clima(d.month)

    pres, deliv, fat, lanches, combos, batatas, bebidas, sobremesas = calcular_vendas(
        dow, d.month, d.day, feriado, int(promo_ativa), fds, data_comem, clima, chuva
    )

    rows.append({
        'data':                d.isoformat(),
        'dia_da_semana':       dow,
        'mês':                 d.month,
        'dia_do_mes':          d.day,
        'feriado':             feriado,
        'promoção_ativa':      int(promo_ativa),
        'final_de_semana':     fds,
        'data_comemorativa':   data_comem,
        'condição_climática':  clima,
        'intensidade_chuva':   chuva,
        'pedidos_presenciais': pres,
        'pedidos_delivery':    deliv,
        'faturamento_total':   fat,
        'qtd_lanches':         lanches,
        'qtd_combos':          combos,
        'qtd_batatas':         batatas,
        'qtd_bebidas':         bebidas,
        'qtd_sobremesas':      sobremesas,
    })

# ============================================================
# SALVA E EXIBE RESUMO
# ============================================================

df = pd.DataFrame(rows)
df.to_csv('dataset_vendas.csv', index=False, encoding='utf-8')

print(f"✅  {len(df)} linhas geradas → dataset_vendas.csv")
print(f"    Período : {inicio} → {fim}")
print()
print(df[['pedidos_presenciais', 'pedidos_delivery',
          'faturamento_total', 'qtd_lanches']].describe().round(1).to_string())
