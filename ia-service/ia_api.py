from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app) 
modelo = joblib.load('modelo_hamburgueria.pkl')

@app.route('/prever_tudo', methods=['POST'])
def prever_tudo():
    data = request.json
    
    dados_entrada = [[
        data['dia_da_semana'], data['mês'], data['dia_do_mes'], 
        data['epoca_pagamento'], data['feriado'], data['promoção_ativa'],
        data['final_de_semana'], data['data_comemorativa'],
        data['condição_climática'], data['intensidade_chuva']
    ]]
    
    predicoes = modelo.predict(dados_entrada)[0]
    
    return jsonify({
        'pedidos_presenciais': round(predicoes[0], 2),
        'pedidos_delivery': round(predicoes[1], 2),
        'faturamento_total': round(predicoes[2],2),
        'qtd_lanches': int(predicoes[3]),
        'qtd_combos': int(predicoes[4]),
        'qtd_batatas': int(predicoes[5]),
        'qtd_bebidas': int(predicoes[6]),
        'qtd_sobremesas': int(predicoes[7])
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)