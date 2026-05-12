entrada = int(input())
c = 0
s = 0
r = 0
cobaias_totais = 0
for i in range(entrada):
    test = input().split()
    if test[1] == 'C':
        c += int(test[0])
    elif test[1] == 'S':
        s += int(test[0])
    elif test[1] == 'R':
        r += int(test[0])
    cobaias_totais += int(test[0])
print(f'Total: {cobaias_totais} cobaias')
print(f'Total de coelhos: {c}')
print(f'Total de ratos: {r}')
print(f'Total de sapos: {s}')
print(f'Percentual de coelhos: {c/cobaias_totais*100:.2f} %')
print(f'Percentual de ratos: {r/cobaias_totais*100:.2f} %')
print(f'Percentual de sapos: {s/cobaias_totais*100:.2f} %')