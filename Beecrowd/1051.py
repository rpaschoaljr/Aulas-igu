def imposto(entrada, taxa):
    return entrada * taxa

entrada = float(input())


if entrada <= 2000.00:
    print("Isento")
elif entrada <= 3000.00:
    print("R$ {:.2f}".format(imposto(entrada - 2000.00, 0.08)))
elif entrada <= 4500.00:
    print("R$ {:.2f}".format(imposto(1000.00, 0.08) + imposto(entrada - 3000.00, 0.18)))
else:
    print("R$ {:.2f}".format(imposto(1000.00, 0.08) + imposto(1500.00, 0.18) + imposto(entrada - 4500.00, 0.28)))

