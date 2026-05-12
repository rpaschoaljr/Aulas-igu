n = int(input())
for i in range(n):
    lista_divisores = []
    entrada = int(input())
    for j in range(1, entrada):
        if entrada % j == 0:
            lista_divisores.append(j)
    if sum(lista_divisores) == entrada:
        print(f"{entrada} eh perfeito")
    else:
        print(f"{entrada} nao eh perfeito")
   
    