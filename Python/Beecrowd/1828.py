regras = {
    "tesoura": ["papel", "lagarto"],
    "papel": ["pedra", "spock"],
    "pedra": ["lagarto", "tesoura"],
    "lagarto": ["spock", "papel"],
    "spock": ["tesoura", "pedra"]
}

def jogar(escolha1, escolha2):
    if escolha1 == escolha2:
        return "De novo!"
    elif escolha2 in regras[escolha1]:
        return "Bazinga!"
    else:
        return "Raj trapaceou!"
    
n = int(input())
for i in range(n):
    escolha1, escolha2 = input().split()
    escolha1 = escolha1.lower()
    escolha2 = escolha2.lower()
    resultado = jogar(escolha1, escolha2)
    print(f"Caso #{i + 1}: {resultado}")