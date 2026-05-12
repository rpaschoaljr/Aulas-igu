total = 0
for i in range(5):
    valor = int(input())
    if valor % 2 == 0:
        total += 1
print(f'{total} valores pares')