t = int(input())
a = 0
for i in range(1000):
    if a == t:
        a = 0   
    print(f"N[{i}] = {a}")
    a += 1