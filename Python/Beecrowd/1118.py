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
            while True:
                continua = input("novo calculo (1-sim 2-nao)\n")
                if continua == "1" or continua == "2":
                    break          
            if continua == "2":
                break
            elif continua == "1":
                notas_validas = 0
            
    else:
        print("nota invalida")
