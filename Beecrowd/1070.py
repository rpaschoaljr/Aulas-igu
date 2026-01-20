entrada = int(input())
if entrada % 2 == 0:
    for i in range(entrada + 1, entrada + 13, 2):
        print(i)
else:
    for i in range(entrada, entrada + 12, 2):
        print(i)