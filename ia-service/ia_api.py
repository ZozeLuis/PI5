from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
from math import ceil
import logging
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(message)s',
    datefmt='%H:%M:%S',
)
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

log.info("📦 Carregando modelo...")
artefato = joblib.load('modelo_hamburgueria.pkl')
modelo   = artefato['modelo']
FEATURES = artefato['features']
log.info(f"✅ Modelo pronto — {len(FEATURES)} features, {modelo.n_estimators} árvores")

# ============================================================
# FEATURE ENGINEERING  (idêntico ao ia.py — evita train/serve skew)
# ============================================================

def preparar_entrada(data: dict) -> list:
    dia   = data['dia_da_semana']
    mes   = data['mês']
    dia_m = data['dia_do_mes']
    clima = data['condição_climática']
    chuva = data['intensidade_chuva']
    promo = data['promoção_ativa']
    fds   = data['final_de_semana']

    linha = {
        'dia_da_semana':      dia,
        'mês':                mes,
        'dia_do_mes':         dia_m,
        'epoca_pagamento':    1 if dia_m <= 10 else 0,
        'semana_do_mes':      min(ceil(dia_m / 7), 4),
        'fim_mes':            1 if dia_m >= 25 else 0,
        'dia_semana_sin':     np.sin(2 * np.pi * dia / 7),
        'dia_semana_cos':     np.cos(2 * np.pi * dia / 7),
        'mes_sin':            np.sin(2 * np.pi * mes / 12),
        'mes_cos':            np.cos(2 * np.pi * mes / 12),
        'feriado':            data['feriado'],
        'promoção_ativa':     promo,
        'final_de_semana':    fds,
        'data_comemorativa':  data['data_comemorativa'],
        'condição_climática': clima,
        'intensidade_chuva':  chuva,
        'fator_chuva':        chuva * (1 if clima <= 1 else 0),
        'promo_fds':          promo * fds,
    }

    return [[linha[f] for f in FEATURES]]

# ============================================================
# ROTA
# ============================================================

@app.route('/prever_tudo', methods=['POST'])
def prever_tudo():
    inicio = time.perf_counter()
    data   = request.json

    climas = {0: 'temporal', 1: 'chuvoso', 2: 'nublado', 3: 'ensolarado'}
    dias   = {1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sáb', 7: 'dom'}
    log.info(
        f"→ Previsão | dia={dias.get(data.get('dia_da_semana'), '?')} "
        f"clima={climas.get(data.get('condição_climática'), '?')} "
        f"promo={'sim' if data.get('promoção_ativa') else 'não'}"
    )

    pred = modelo.predict(preparar_entrada(data))[0]
    ms   = (time.perf_counter() - inicio) * 1000

    log.info(
        f"← Resultado | fat=R${pred[2]:.0f} "
        f"lanches={int(pred[3])} delivery={int(pred[1])} "
        f"[{ms:.0f}ms]"
    )

    return jsonify({
        'pedidos_presenciais': round(float(pred[0]), 2),
        'pedidos_delivery':    round(float(pred[1]), 2),
        'faturamento_total':   round(float(pred[2]), 2),
        'qtd_lanches':         int(pred[3]),
        'qtd_combos':          int(pred[4]),
        'qtd_batatas':         int(pred[5]),
        'qtd_bebidas':         int(pred[6]),
        'qtd_sobremesas':      int(pred[7]),
    })

if __name__ == '__main__':
    app.run(port=5000, debug=False)
