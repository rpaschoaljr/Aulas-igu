#class produto, nome codigo preço estoque
#metodo mostrar imprimir /\
#class caixa atibutos > produtos total vendido
#metodos add produto, listar mostrar todos produtos, buscar produto pelo codigo, vender produto vender pelo codigo e quantidade, mostrar total vendido
#main com menu 1 mostrar 2 vender 3 saldo 4 sair
from produto import Produto
from caixa import Caixa
from funcoes import limpar, marcar_tempo, verificar_numero

caixa = Caixa()

while True:
    print("Bem vindo")
    print("Selecione a Opção desejada:")
    print("1 - Cadastro de produto")
    print("2 - Vender produto")
    print("3 - Mostrar produtos")
    print("4 - Saldo de vendas")
    print("5 - Sair")
  
    a = input("Digite a opção: ")
    a = verificar_numero(a)

    if a == 5:
        break
    elif a == 1: # cadrastro
        nome = input("Digite o nome: ")
        codigo = input("Digite o codigo: ")
        preco = verificar_numero(input("Digite o valor (ex: 1.10): "))
        quantidade = verificar_numero(input("Digite a quantidade: "))
        produto = Produto(nome, codigo, preco, quantidade)
        caixa.adicionar(produto)
        continue
    elif a == 2:# vender
        codigo = input("Digite o codigo do produto: ")
        quantidade = verificar_numero(input("Digite a quantidade: "))
        caixa.vender(codigo, quantidade, marcar_tempo())
        continue
    elif a == 3:# mostrar produtos
        caixa.listra_produtos()
        continue
    elif a == 4:# saldo de vendas
        caixa.total_vendido()
        continue
    else:
        limpar()
        print(marcar_tempo())
        print("Errou!!")
    limpar()