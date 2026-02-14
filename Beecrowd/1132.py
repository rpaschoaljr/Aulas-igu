a = int(input())
b = int(input())
lista = []
if a > b:
    a, b = b, a
for i in range(a, b + 1):
    if i % 13 != 0:
        lista.append(i)
print(sum(lista))
