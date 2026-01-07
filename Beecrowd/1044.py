entrada = list(map(int, input().split()))
entrada.sort()
if(entrada[1]%entrada[0] == 0):
    print("Sao Multiplos")
else:
    print("Nao sao Multiplos")