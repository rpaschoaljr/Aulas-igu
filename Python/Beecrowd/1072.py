entrada_n = int(input())
cont_check_in = 0
cont_check_out = 0
for i in range(entrada_n):
    check = int(input())
    if check >= 10 and check <= 20:
        cont_check_in += 1
    else:
        cont_check_out += 1
print(f"{cont_check_in} in")
print(f"{cont_check_out} out")