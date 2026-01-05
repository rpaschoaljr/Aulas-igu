conta_gorjeta = input("Digite o valor da conta e a porcentagem da gorjeta separados por vírgula: ")
valores = conta_gorjeta.split(',')
valor_conta = float(valores[0].strip())
porcentagem_gorjeta = float(valores[1].strip())
valor_gorjeta = valor_conta * (porcentagem_gorjeta / 100)
total_com_gorjeta = valor_conta + valor_gorjeta
print(f'Gorjeta: R$ {valor_gorjeta:.2f}, Total: R$ {total_com_gorjeta:.2f}')