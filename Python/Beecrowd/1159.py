while True:
    x= int(input())
    if x == 0:
        break
    lista = []
    while True:
        if x % 2 == 0:
            lista.append(x)
        if len(lista) == 5:
            break
        x+= 1
    print(sum(lista))