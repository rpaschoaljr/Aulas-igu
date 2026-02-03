total_positivo = 0
soma_positivo = 0.0
for i in range(0, 6):
    entrada = float(input())
    if entrada > 0:
        total_positivo += 1
        soma_positivo = soma_positivo + entrada
print(f'{total_positivo} valores positivos')
print(f'{soma_positivo / total_positivo:.1f}')