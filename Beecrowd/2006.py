resposta_certa = int(input())
resposta_usuario = list(map(int, input().split()))
contador = 0
for i in resposta_usuario:
    if i == resposta_certa:
        contador += 1
print(contador)