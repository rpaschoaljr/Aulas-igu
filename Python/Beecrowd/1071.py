entrada_1 = int(input())
entrada_2 = int(input())
entradas = [entrada_1, entrada_2]
entradas.sort()
entrada_1 = entradas[0]
entrada_2 = entradas[1]
lista = []
for i in range(entrada_1+1, entrada_2):
    if i % 2 != 0:
        lista.append(i)
print(sum(lista))