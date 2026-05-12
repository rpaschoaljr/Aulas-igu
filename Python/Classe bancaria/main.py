from conta import ContaBancaria

ContaBancaria1 = ContaBancaria("Ricardo", 1000)

print(ContaBancaria1.titular)
print(ContaBancaria1.saldo)
print(ContaBancaria1.depositar(500))
print(ContaBancaria1.sacar(1000))
