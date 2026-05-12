def posicao_menor(lista):
    menor = lista[0]
    posicao = 0
    for i in range(len(lista)):
        if lista[i] < menor:
            menor = lista[i]
            posicao = i
    return posicao

n = int(input())
lista = list(map(int, input().split()))
posicao = posicao_menor(lista)
print(f"Menor valor: {lista[posicao]}")
print(f"Posicao: {posicao}")