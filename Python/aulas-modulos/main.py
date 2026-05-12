# Metodo media onde vc passa uma lista de notas float e retorna a media
# Metodo aprovado onde vc passa a media e ele retorna True se a media >= 7 caso contrario retorna False
# Metodo situacao onde vc passa uma lista de notas float e retorna "Aprovado" ou "Reprovado"

import metodos.notas

entrada = list(map(float, input("Digite as notas: ").split()))

media = metodos.notas.calcular_media(entrada)

aprovacao = metodos.notas.calcular_aprovacao(media)

print(f"Situação: {aprovacao}")

