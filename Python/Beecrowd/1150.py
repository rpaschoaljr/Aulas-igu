x = int(input())
z = int(input())
while z <= x:
    z = int(input())
lista = []
lista.append(x)
for i in range(x, z + 1):
    x += i
    lista.append(i)
    if x > z:
        break
print(len(lista))