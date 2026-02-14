entrada_n = int(input())
for i in range(entrada_n):
    x, y = map(int, input().split())
    if y == 0:
        print("divisao impossivel")
    else:
        print(f"{x / y:.1f}")