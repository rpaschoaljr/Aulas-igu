entrada = 0
alcool = 0
gasolina = 0
diesel = 0
print("MUITO OBRIGADO")
while (entrada != 4):
    entrada = int(input())
    if entrada == 1:
        alcool += 1
    elif entrada == 2:
        gasolina += 1
    elif entrada == 3:
        diesel += 1
print(f"Alcool: {alcool}")
print(f"Gasolina: {gasolina}")
print(f"Diesel: {diesel}")