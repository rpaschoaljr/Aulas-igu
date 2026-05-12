entradas = int(input())
x = []
y = []
for i in range(entradas):
    entrada = list(map(int, input().split()))
    if entrada[1] == 1 or entrada[1] == -1:
        x.append(entrada[0])
        y.append(entrada[1])
print(x)
print(y)