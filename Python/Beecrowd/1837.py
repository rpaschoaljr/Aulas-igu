a, b = map(int, input().split())
q = a // b
r = a % b
if r < 0:
    if b > 0:
        q -= 1
        r += b
    else:
        q += 1
        r -= b
print(f"{q} {r}")