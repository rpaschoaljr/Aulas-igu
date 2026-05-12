n = int(input())
for i in range(1, n + 1):
    x, y = map(int, input().split())
    soma = 0
    cont_impares = 0
    numero_atual = x
    
    while cont_impares < y:
        if numero_atual % 2 != 0:
            soma += numero_atual
            cont_impares += 1
        
        numero_atual += 1
        
    print(soma)