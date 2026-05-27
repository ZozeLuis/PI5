import pandas as pd
import numpy as np
from math import ceil
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from tqdm import tqdm
import joblib
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# CARREGAMENTO  (CSV gerado por gerar_dataset.py)
# ============================================================

print("📂 Carregando dataset...")
df = pd.read_csv('dataset_vendas.csv')
df = df.drop(columns=['data'], errors='ignore')
df = df.dropna()
print(f"   {len(df)} linhas | {df.shape[1]} colunas")

# ============================================================
# FEATURE ENGINEERING
# ============================================================
# Por que cada feature importa:
#
#  Cíclicas (sin/cos): o modelo aprende que domingo→segunda e
#  dezembro→janeiro são contínuos — sem o sin/cos, 7 e 1 parecem
#  extremos opostos em vez de dias consecutivos.
#
#  semana_do_mes: comportamento por semana (1ª semana = logo após
#  pagamento, 4ª = fim do mês antes de fechar).
#
#  fim_mes: segundo pulso de compras nos dias 25–31.
#
#  fator_chuva: intensidade só conta quando o clima é ruim (≤1).
#  Evita que "nublado + chuva fraca" receba o mesmo peso que
#  "temporal + chuva forte".
#
#  promo_fds: promoção em dia de semana tem impacto menor que no
#  final de semana — a interação captura esse efeito combinado.

def engenharia_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df['semana_do_mes']   = df['dia_do_mes'].apply(lambda d: min(ceil(d / 7), 4))
    df['fim_mes']         = (df['dia_do_mes'] >= 25).astype(int)
    df['epoca_pagamento'] = (df['dia_do_mes'] <= 10).astype(int)

    df['dia_semana_sin']  = np.sin(2 * np.pi * df['dia_da_semana'] / 7)
    df['dia_semana_cos']  = np.cos(2 * np.pi * df['dia_da_semana'] / 7)
    df['mes_sin']         = np.sin(2 * np.pi * df['mês'] / 12)
    df['mes_cos']         = np.cos(2 * np.pi * df['mês'] / 12)

    df['fator_chuva']     = df['intensidade_chuva'] * (df['condição_climática'] <= 1).astype(int)
    df['promo_fds']       = df['promoção_ativa'] * df['final_de_semana']

    return df

print("⚙️  Calculando features...")
df = engenharia_features(df)
print(f"   {len(df.columns)} colunas após feature engineering")

# ============================================================
# FEATURES E ALVOS
# ============================================================

FEATURES = [
    # Base temporal
    'dia_da_semana', 'mês', 'dia_do_mes',
    # Período do mês
    'epoca_pagamento', 'semana_do_mes', 'fim_mes',
    # Sazonalidade cíclica
    'dia_semana_sin', 'dia_semana_cos', 'mes_sin', 'mes_cos',
    # Contexto do dia
    'feriado', 'promoção_ativa', 'final_de_semana', 'data_comemorativa',
    # Clima
    'condição_climática', 'intensidade_chuva',
    # Interações
    'fator_chuva', 'promo_fds',
]

ALVOS = [
    'pedidos_presenciais', 'pedidos_delivery', 'faturamento_total',
    'qtd_lanches', 'qtd_combos', 'qtd_batatas', 'qtd_bebidas', 'qtd_sobremesas',
]

X = df[FEATURES]
y = df[ALVOS]

# ============================================================
# TREINAMENTO
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"   Treino: {len(X_train)} linhas | Teste: {len(X_test)} linhas")

# Treina em lotes para mostrar progresso real
N_TREES = 300
BATCH   = 30

modelo = RandomForestRegressor(
    n_estimators=BATCH,
    warm_start=True,
    min_samples_leaf=2,
    n_jobs=-1,
    random_state=42,
)

print("🌲 Treinando Random Forest...")
with tqdm(total=N_TREES, desc="   árvores", unit="tree", ncols=60) as pbar:
    feitas = 0
    while feitas < N_TREES:
        lote = min(BATCH, N_TREES - feitas)
        modelo.n_estimators = feitas + lote
        modelo.fit(X_train, y_train)
        feitas += lote
        pbar.update(lote)

# ============================================================
# AVALIAÇÃO
# ============================================================

previsoes = modelo.predict(X_test)
erros = mean_absolute_error(y_test, previsoes, multioutput='raw_values')
r2    = r2_score(y_test, previsoes, multioutput='raw_values')

print("=" * 58)
print("          PERFORMANCE DA IA POR CATEGORIA")
print("=" * 58)
for i, col in enumerate(ALVOS):
    unidade = "R$" if "faturamento" in col else "unid."
    barra   = "█" * max(0, int(r2[i] * 25))
    print(f"  {col.upper():<30} {barra}")
    print(f"    Erro médio : {unidade} {erros[i]:.2f}/dia")
    print(f"    Precisão R²: {r2[i]:.2%}")
    print("-" * 58)

# ============================================================
# SALVAR  (dicionário com modelo + lista de features)
# ============================================================

joblib.dump({'modelo': modelo, 'features': FEATURES}, 'modelo_hamburgueria.pkl')
print("\n✅ Modelo salvo: modelo_hamburgueria.pkl")
