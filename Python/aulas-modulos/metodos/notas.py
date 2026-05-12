
def calcular_media(notas):
    if len(notas) == 0:
        return 0
    return sum(notas) / len(notas)

def calcular_aprovacao(media, limite=7):
    if media >= limite:
        return "Aprovado"
    else:
        return "Reprovado"