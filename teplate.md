<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<title>Recibo de Pagamento</title>

<style>
body {
    font-family: 'Segoe UI', sans-serif;
    background: #f4f6f9;
    padding: 20px;
}

.recibo {
    width: 800px;
    margin: auto;
    background: #fff;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

/* HEADER */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #eee;
    padding-bottom: 15px;
}

.logo {
    height: 60px;
}

.titulo {
    font-size: 22px;
    font-weight: bold;
    color: #333;
}

/* INFO GRID */
.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 20px;
}

.box {
    background: #f9fafc;
    padding: 10px;
    border-radius: 8px;
}

.label {
    font-size: 11px;
    color: #888;
}

.valor {
    font-weight: bold;
    color: #222;
}

/* VALOR DESTAQUE */
.valor-destaque {
    background: #fff8c4;
    border: 2px solid #f1c40f;
    padding: 15px;
    border-radius: 10px;
    font-size: 20px;
    text-align: right;
    font-weight: bold;
}

/* DESCRIÇÃO */
.descricao {
    margin-top: 20px;
}

.descricao-box {
    background: #f9fafc;
    padding: 15px;
    border-radius: 8px;
    min-height: 80px;
}

/* RODAPÉ */
.footer {
    margin-top: 40px;
    text-align: center;
    font-size: 12px;
    color: #777;
}

/* ASSINATURA */
.assinatura {
    margin-top: 50px;
    text-align: center;
}

.linha {
    width: 300px;
    border-top: 1px solid #000;
    margin: 0 auto 5px;
}

</style>
</head>

<body>

<div class="recibo">

    <!-- HEADER -->
    <div class="header">
        <img src="{{logo_url}}" class="logo">
        <div class="titulo">RECIBO DE PAGAMENTO</div>
    </div>

    <!-- DADOS -->
    <div class="grid">

        <div class="box">
            <div class="label">FORNECEDOR</div>
            <div class="valor">{{fornecedor_nome}}</div>
        </div>

        <div class="box">
            <div class="label">CPF / CNPJ</div>
            <div class="valor">{{fornecedor_cpf}}</div>
        </div>

        <div class="box">
            <div class="label">EMPRESA PAGADORA</div>
            <div class="valor">{{empresa_nome}}</div>
        </div>

        <div class="box">
            <div class="label">CNPJ</div>
            <div class="valor">{{empresa_cnpj}}</div>
        </div>

    </div>

    <!-- VALOR -->
    <div class="valor-destaque">
        R$ {{valor}}
    </div>

    <!-- HISTÓRICO -->
    <div class="descricao">
        <div class="label">REFERENTE A</div>
        <div class="descricao-box">
            {{descricao}}
        </div>
    </div>

    <!-- DADOS BANCÁRIOS -->
    <div class="grid" style="margin-top:20px;">
        <div class="box">
            <div class="label">FORMA DE PAGAMENTO</div>
            <div class="valor">{{forma_pagamento}}</div>
        </div>

        <div class="box">
            <div class="label">CHAVE PIX</div>
            <div class="valor">{{pix}}</div>
        </div>
    </div>

    <!-- ASSINATURA -->
    <div class="assinatura">
        <div class="linha"></div>
        <div>{{fornecedor_nome}}</div>
    </div>

    <!-- DATA -->
    <div class="footer">
        {{cidade}} - {{data}}
        <br>
        {{empresa_nome}} - {{empresa_cnpj}}
    </div>

</div>

</body>
</html>






data = {
    "logo_url": "...",
    "fornecedor_nome": "...",
    "fornecedor_cpf": "...",
    "empresa_nome": "...",
    "empresa_cnpj": "...",
    "valor": "2.259,00",
    "descricao": "Aluguel de sala referente a março/2025",
    "forma_pagamento": "PIX",
    "pix": "07100108500",
    "cidade": "Aracaju",
    "data": "18 de Abril de 2025"
}