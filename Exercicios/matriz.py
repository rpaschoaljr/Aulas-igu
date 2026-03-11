matriz = []
for i in range(2):
    linha = []
    for j in range(2):
        entrada = input()
        linha.append(entrada)
    matriz.append(linha)
for i in range(2):
    for j in range(2):
        print(matriz[i][j], end=" ")
    print()