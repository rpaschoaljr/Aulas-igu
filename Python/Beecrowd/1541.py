while True:
    try:
        a, b, c = map(int, input().split())
    except:
        break
    area_casa = a * b
    area_terreno = area_casa * 100 // c
    lado = int(area_terreno ** 0.5)
    print(lado)
    