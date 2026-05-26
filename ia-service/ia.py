import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score


df = pd.read_excel('base_vendas_18_meses.xlsx')

mapa_dias = {
    'segunda-feira' : 1,
    'terça-feira' : 2,
    'quarta-feira': 3,
    'quinta-feira': 4,
    'sexta-feira': 5,
    'sábado': 6,
    'domingo':7
}

mapa_mes = {
    '01 - janeiro': 1,
    '02 - fevereiro': 2,
    '03 - março': 3,
    '04 - abril': 4,
    '05 - maio': 5,
    '06 - junho': 6,
    '07 - julho': 7,
    '08 - agosto': 8,
    '09 - setembro': 9,
    '10 - outubro': 10,
    '11 - novembro': 11,
    '12 - dezembro': 12
}

mapa_condicao_climatica = {
    'temporal': 0,
    'chuvoso': 1,
    'nublado': 2,
    'ensolarado': 3
}

mapa_intensidade_chuva = {
    'nenhuma': 0,
    'fraca': 1,
    'forte': 2
}

df['feriado'] = df['feriado'].map({'sim': 1,'não': 0})
df['promoção_ativa'] = df['promoção_ativa'].map({'sim': 1, 'não': 0})
df['dia_da_semana'] = df['dia_da_semana'].map(mapa_dias)
df['mês'] = df['mês'].map(mapa_mes)
df['final_de_semana'] = df['final_de_semana'].map({'sim':1, 'não':0})
df['data_comemorativa'] = df['data_comemorativa'].map({'sim':1, 'não':0})
df['condição_climática'] = df['condição_climática'].map(mapa_condicao_climatica)
df['intensidade_chuva'] = df['intensidade_chuva'].map(mapa_intensidade_chuva)
df['data'] = pd.to_datetime(df['data'])
df['dia_do_mes'] = df['data'].dt.day
df['epoca_pagamento'] = df['dia_do_mes'].apply(lambda x: 1 if x <= 10 else 0)



df = df.dropna(subset=['dia_da_semana', 'mês', 'condição_climática', 'intensidade_chuva', 'faturamento_total'])

df.dropna()

x = df[['dia_da_semana', 'mês','dia_do_mes', 'epoca_pagamento', 'feriado', 'promoção_ativa', 
        'final_de_semana', 'data_comemorativa', 'condição_climática', 'intensidade_chuva']]

colunas_alvo = ['pedidos_presenciais', 'pedidos_delivery', 'faturamento_total', 'qtd_hamburgueres','qtd_combos','qtd_batatas', 'qtd_bebidas', 'qtd_sobremesas']


y = df[colunas_alvo]

x_train, x_test, y_train, y_test = train_test_split(x,y, test_size = 0.2, random_state = 42)

modelo = RandomForestRegressor(n_estimators=100, random_state=42)
modelo.fit(x_train, y_train)

previsoes = modelo.predict(x_test)
erros_por_coluna = mean_absolute_error(y_test, previsoes, multioutput='raw_values')
r2_por_coluna = r2_score(y_test, previsoes, multioutput='raw_values')

print("-" * 50)
print("     PERFORMANCE DA IA POR CATEGORIA     ")
print("-" * 50)

for i, coluna in enumerate(colunas_alvo):
    unidade = "R$" if "faturamento" in coluna else "unid."
    
    print(f"=> {coluna.upper()}:")
    print(f"   Erro Médio: {unidade} {erros_por_coluna[i]:.2f} por dia")
    print(f"   Precisão (R²): {r2_por_coluna[i]:.2%}")
    print("-" * 50)

import joblib

joblib.dump(modelo, 'modelo_hamburgueria.pkl')
print("modelo salvo")
