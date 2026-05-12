notas = input("Digite as notas separadas por vírgula: ")
lista_notas = notas.split(',')
nota1 = float(lista_notas[0].strip())
nota2 = float(lista_notas[1].strip())
nota3 = float(lista_notas[2].strip())
media = (nota1 + nota2 + nota3) / 3
print(f'A média é: {media:.1f}')