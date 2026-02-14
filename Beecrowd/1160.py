t = int(input())

for _ in range(t):

    entrada = input().split()
    pa, pb = int(entrada[0]), int(entrada[1])
    g1, g2 = float(entrada[2]), float(entrada[3])
    
    anos = 0
    while pa <= pb:

        pa += int(pa * (g1 / 100))
        pb += int(pb * (g2 / 100))
        anos += 1
        
        if anos > 100:
            break
            
    if anos > 100:
        print("Mais de 1 seculo.")
    else:
        print(f"{anos} anos.")