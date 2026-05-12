entrada = float(input())

if entrada <= 400:
    reajuste = 0.15
elif entrada >= 400.01 and entrada <= 800:
    reajuste = 0.12
elif entrada >= 800.01 and entrada <= 1200:
    reajuste = 0.10
elif entrada >= 1200.01 and entrada <= 2000:
    reajuste = 0.07
else:
    reajuste = 0.04
    
salario = entrada + (entrada * reajuste)
valor_reajuste = salario - entrada
print(f"Novo salario: {salario:.2f}")
print(f"Reajuste ganho: {valor_reajuste:.2f}")
print(f"Em percentual: {int(reajuste * 100)} %")