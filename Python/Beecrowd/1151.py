n = int(input())

a, b = 0, 1
resultado = []

for _ in range(n):
    resultado.append(str(a))
    a, b = b, a + b

print(" ".join(resultado))