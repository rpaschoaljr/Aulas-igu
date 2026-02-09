for i in range(0, 21, 2):
    valor_i = i / 10
    for j in range(1, 4):
        valor_j = j + valor_i
        if valor_i == int(valor_i):
            print(f'I={int(i/10)} J={int(valor_j)}')
        else:
            print(f'I={valor_i:.1f} J={valor_j:.1f}')