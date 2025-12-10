# Escreva um programa que leia 2 numeros inteiros e exiba da seguinte forma
# a = 2
# b = 5

# Resultado:
# 2x5 = 10
# 2+5 = 7
# 2-5 = -3
# 2/5 = 0.4

a = int(input("Digite o primeiro numero: "))
b = int(input("Digite o segundo numero: "))

print(f"{a}x{b}={a*b}")
print(f"{a}+{b}={a+b}")
print(f"{a}-{b}={a-b}")
print(f"{a}/{b}={a/b}")
print(f"{a}//{b}={a//b}")