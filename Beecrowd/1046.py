entrada = list(map(int, input().split()))
a = entrada[0]
b = entrada[1]
tempo = 24 - a
tempo = tempo + b
if tempo > 24:
    tempo = tempo - 24
print(f"O JOGO DUROU {tempo} HORA(S)")