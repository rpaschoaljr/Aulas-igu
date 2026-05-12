import sys

while True:
    linha = sys.stdin.readline()
    if not linha:
        break
    
    n = int(linha)

    inicio_interno = n // 3
    fim_interno = n - 1 - inicio_interno
    centro = n // 2

    for i in range(n):
        for j in range(n):
            if i == centro and j == centro:
                valor = 4
            elif i >= inicio_interno and i <= fim_interno and \
                 j >= inicio_interno and j <= fim_interno:
                valor = 1
            elif i == j:
                valor = 2
            elif i + j == n - 1:
                valor = 3
            else:
                valor = 0
            
            print(valor, end="")
        print()
    
    print()