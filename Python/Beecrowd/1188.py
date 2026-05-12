soma = 0
cont = 0
O = input()
for i in range(12):
    for j in range(12):
        valor = float(input())
        if j < i and i + j > 11:
            soma += valor
            cont += 1
if O == "S":
    print(f"{soma:.1f}")
else:
    print(f"{soma/cont:.1f}")