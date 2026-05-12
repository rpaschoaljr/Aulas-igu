# Leitura dos três valores de ponto flutuante
entrada = input().split()
lados = [float(x) for x in entrada]

# Ordenar em ordem decrescente para garantir que A seja o maior
lados.sort(reverse=True)
A, B, C = lados

# Verificação se os lados formam um triângulo
if A >= B + C:
    print("NAO FORMA TRIANGULO")
else:
    # Classificação quanto aos ângulos
    # Usamos A**2 para representar A ao quadrado
    if A**2 == (B**2 + C**2):
        print("TRIANGULO RETANGULO")
    elif A**2 > (B**2 + C**2):
        print("TRIANGULO OBTUSANGULO")
    elif A**2 < (B**2 + C**2):
        print("TRIANGULO ACUTANGULO")

    # Classificação quanto aos lados
    if A == B == C:
        print("TRIANGULO EQUILATERO")
    elif A == B or B == C or A == C:
        print("TRIANGULO ISOSCELES")