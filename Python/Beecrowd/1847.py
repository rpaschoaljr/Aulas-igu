a, b, c = map(int, input().split())

situacao1 = b - a
situacao2 = c - b

if situacao1 < 0 and situacao2 >= 0: # Regra 1
    print(":)") 
elif situacao1 > 0 and situacao2 <= 0: # Regra 2
    print(":(") 
elif situacao1 > 0 and situacao2 > 0 and situacao2 < situacao1: # Regra 3
    print(":(") 
elif situacao1 > 0 and situacao2 > 0 and situacao2 >= situacao1: # Regra 4
    print(":)") 
elif situacao1 < 0 and situacao2 < 0 and abs(situacao2) < abs(situacao1): # Regra 5
    print(":)") 
elif situacao1 < 0 and situacao2 < 0 and abs(situacao2) >= abs(situacao1): # Regra 6
    print(":(") 
elif situacao1 == 0: # Regra 7
    if situacao2 > 0:
        print(":)")
    else: # Regra 8
        print(":(")