while True:
    try:
        l = int(input())
        lista = list(map(int, input().split()))
        velocidade_max = max(lista)
        if velocidade_max < 10:
            print("1")
        elif velocidade_max < 20:
            print("2")
        else:
            print("3")
    except EOFError:
        break