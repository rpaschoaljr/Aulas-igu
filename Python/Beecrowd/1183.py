soma = 0
cont = 0
O = input()
for i in range(12):
    comecar_gravar = False
    for j in range(12):
        valor = float(input())
        if comecar_gravar:        
            soma += valor
        if O == "M" and comecar_gravar:
            cont += 1
        if i == j:
            comecar_gravar = True
if O == "S":
    print(f"{soma:.1f}")
else:
    print(f"{soma/cont:.1f}")