texto = input("Digite seu endereço: ")
endereco = texto.split(',')
print(f'Rua {endereco[0].strip()}, {endereco[1].strip()} - {endereco[2].strip()}')