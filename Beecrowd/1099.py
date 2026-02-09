entrada_n = int(input())
lista = []
for i in range(entrada_n):
    x, y = map(int, input().split())
    if x > y:
        x, y = y, x
    for j in range(x, y):
        if j == x or j == y:
            continue
        if j % 2 != 0:
            lista.append(j)
    print(sum(lista))
    lista = []  