while True:
    a , b = map(int, input().split())
    if a < b:
        print("Crescente")
    elif a > b:
        print("Decrescente")
    else:
        break