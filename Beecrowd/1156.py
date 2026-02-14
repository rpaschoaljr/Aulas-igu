s = 0
divisor = 1
for i in range(1,40,2):
    s += i / divisor
    divisor = divisor * 2
print(f"{s:.2f}")