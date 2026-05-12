while True:
    n = int(input())
    if n == 0:
        break
    valor_total = 2**(2 * (n - 1))
    offset = len(str(valor_total))
    for i in range(n):

        for j in range(0, n):
            valor = 2**(i + j)
            if j == n - 1:
                print(f'{valor:>{offset}}', end="")
            else:
                print(f'{valor:>{offset}}', end=" ")       
        print()
    print()