while(True):
    x, y = map(int, input().split())
    if x <=  0 or y <= 0:
        break
    if x > y:
        x, y = y, x
    soma = 0
    for i in range(x, y + 1):
        soma += i
        print(f"{i}", end=" ")
    print(f"Sum={soma}")
    soma = 0