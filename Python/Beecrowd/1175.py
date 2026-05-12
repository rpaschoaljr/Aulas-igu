lista_original = []
for i in range(20):
    entrada = int(input())
    lista_original.append(entrada)
lista_original.reverse()
for i in range(20):
    print(f"N[{i}] = {lista_original[i]}")