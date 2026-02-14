inter_wins = 0
gremio_wins = 0
grenais = 0
empates = 0
while True:
    inter, gremio = map(int, input().split())
    if inter > gremio:
        inter_wins += 1
    elif inter < gremio:
        gremio_wins += 1
    else:
        empates += 1
    grenais += 1
    continue_input = input("Novo grenal (1-sim 2-nao)\n")
    if continue_input == "2":
        break
    if continue_input == "1":
        continue
print(f"{grenais} grenais")
print(f"Inter:{inter_wins}")
print(f"Gremio:{gremio_wins}")
print(f"Empates:{empates}")
if inter_wins > gremio_wins:
    print("Inter venceu mais")
elif gremio_wins > inter_wins:
    print("Gremio venceu mais")
else:
    print("Nao houve vencedor")