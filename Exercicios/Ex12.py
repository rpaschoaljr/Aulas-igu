texto = input("Digite dois numeros separados por vírgula: ")
numero = texto.split(',')
resultado = int(numero[0].strip()) + int(numero[1].strip())
print(f'{resultado}')