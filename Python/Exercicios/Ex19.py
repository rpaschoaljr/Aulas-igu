entrada = input("Digite 3 frutas separadas por vírgula: ")
frutas = list(map(str.strip, entrada.split(',')))
print(f'{frutas}')