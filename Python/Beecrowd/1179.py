impar = []
par = []
for i in range(15):
    entrada = int(input())
    if entrada % 2 == 0:
        par.append(entrada)
    else:
        impar.append(entrada)
    if  len(impar) == 5:
        for j in range(5):
            print(f"impar[{j}] = {impar[j]}")
        impar = []
    if len(par) == 5:
        for j in range(5):
            print(f"par[{j}] = {par[j]}")
        par = []
for i in range(len(impar)):
    print(f"impar[{i}] = {impar[i]}")
for i in range(len(par)):
    print(f"par[{i}] = {par[i]}")