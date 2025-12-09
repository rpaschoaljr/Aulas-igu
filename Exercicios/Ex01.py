#Ler do input  armazenar em variaveis, nome, rua, numero, cep e cidade
#ENVIAR PARA: Maria
#ENDEREÇO: Rua das Flores, 15 | CEP: 1200-001
#CIDADE: Lisboa

nome = input("Digite o nome do destinatario: ")
cep = input("Digite o CEP: ")
rua = input("Digite o nome da rua: ")
numero = input("Digite o numero da casa: ")
cidade = input("Digite a cidade: ")
print(f'Enviar para: {nome}')
print(f'Endereço: {rua}, {numero} | CEP: {cep}')
print(f'Cidade: {cidade}')
print()
print(f'Enviar para: {nome}\nEndereço: {rua}, {numero} | CEP: {cep}\nCidade: {cidade}')