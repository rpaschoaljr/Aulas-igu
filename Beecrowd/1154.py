soma = 0
cont = 0
while True:
    idade = int(input())
    if idade < 0:
        break
    soma += idade
    cont += 1
media = soma / cont
print(f"{media:.2f}")