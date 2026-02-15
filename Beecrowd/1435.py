while True:
    n = int(input())
    if n == 0:
        break
    
    for i in range(n):
        for j in range(n):
            valor = min(i, j, n - 1 - i, n - 1 - j) + 1
            print(f"{valor:>3}", end="")
            if j < n - 1:
                print(" ", end="")
            else:
                print()
    print()