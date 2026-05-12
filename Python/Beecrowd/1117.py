notas_validas = 0
while True:
    nota = float(input())
    if 0 <= nota <= 10:
        notas_validas += 1
        if notas_validas == 1:
            nota_1 = nota
        if notas_validas == 2:
            nota_2 = nota
            media = (nota_1 + nota_2) / 2
            print(f"media = {media:.2f}")
            break
    else:
        print("nota invalida")
