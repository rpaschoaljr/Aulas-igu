C = int(input())
t = input()
lista = []
for i in range(12):
    for j in range(12):
        entrada = float(input())
        if j == C:
            lista.append(entrada)
if t == "S":
    print(f"{sum(lista):.1f}")
else:
    print(f"{sum(lista)/len(lista):.1f}")