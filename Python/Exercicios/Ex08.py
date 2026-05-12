# Ex:

# Ler 2 linhas do teclado que vao estar no seguinte formato
# 2 4 6
# 1 3 5

# Imprimir usando o print da seguinte forma:
# 1 2 3 4 5 6
# 123456

linha1 = input().split()
linha2 = input().split()
lista_numeros = linha1 + linha2
lista_numeros.sort()
print(" ".join(lista_numeros))
print("".join(lista_numeros))