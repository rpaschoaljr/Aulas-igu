n = int(input())
for i in range(n):
    entrada = int(input())
    cont = 0
    for j in range(1, entrada + 1):
        if entrada % j == 0:
            cont += 1
    if cont == 2:
        print(f"{entrada} eh primo")
    else:
        print(f"{entrada} nao eh primo")