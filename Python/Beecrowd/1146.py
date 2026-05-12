while True:
    entrada = int(input())
    if entrada == 0:
        break
    for i in range(1, entrada):
        print(i, end=" ")
    print(entrada)