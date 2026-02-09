entrada_n = int(input())
for i in range(entrada_n):
    entrada = int(input())
    if entrada % 2 == 0 and entrada > 0:
        print("EVEN POSITIVE")
    elif entrada % 2 != 0 and entrada > 0:
        print("ODD POSITIVE")
    elif entrada % 2 == 0 and entrada < 0:
        print("EVEN NEGATIVE")
    elif entrada % 2 != 0 and entrada < 0:
        print("ODD NEGATIVE")
    else:
        print("NULL")