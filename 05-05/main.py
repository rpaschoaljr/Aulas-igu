#class produto, nome codigo preço estoque
#metodo mostrar imprimir /\
#class caixa atibutos > produtos total vendido
#metodos add produto, listar mostrar todos produtos, buscar produto pelo codigo, vender produto vender pelo codigo e quantidade, mostrar total vendido
#main com menu 1 mostrar 2 vender 3 saldo 4 sair
from produto import Produto
from caixa import Caixa
caixa = Caixa()

while True:
    print("Bem vindo")
    print("Selecione a Opção desejada:")
    print("1 - Cadastro de produto")
    print("2 - Vender produto")
    print("3 - Mostrar produtos")
    print("4 - Saldo de vendas")
    print("5 - Sair")
    a = int(input("Digite a opção: "))
    if a == 5:
        break
    elif a == 1: # cadrastro
        nome = input("Digite o nome: ")
        codigo = input("Digite o codigo: ")
        preco = float(input("Digite o valor (ex: 1.10): "))
        quantidade = int(input("Digite a quantidade: "))
        produto = Produto(nome, codigo, preco, quantidade)
        caixa.adicionar(produto)
        continue
    elif a == 2:# vender
        codigo = input("Digite o codigo do produto: ")
        quantidade = int(input("Digite a quantidade: "))
        caixa.vender(codigo, quantidade)
        continue
    elif a == 3:# mostrar produtos
        caixa.listra_produtos()
        continue
    elif a == 4:# saldo de vendas
        caixa.total_vendido()
        continue
    else:
        print("Errou!!")