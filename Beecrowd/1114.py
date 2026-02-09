senha = 2002
while True:
    entrada = int(input())
    if entrada == senha:
        print("Acesso Permitido")
        break
    else:
        print("Senha Invalida")