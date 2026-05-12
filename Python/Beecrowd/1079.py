entrada = int(input())
for i in range(entrada):
    valores = input().split()
    a = float(valores[0])*2
    b = float(valores[1])*3
    c = float(valores[2])*5
    media_ponderada = (a+b+c)/10
    print(f"{media_ponderada:.1f}")