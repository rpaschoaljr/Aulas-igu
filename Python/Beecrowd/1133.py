x = int(input())
y = int(input())
if x > y:
    x, y = y, x
lista = []
for i in range(x+1, y):
    if i % 5 == 2 or i % 5 == 3:
        lista.append(i)
print(*lista, sep="\n")