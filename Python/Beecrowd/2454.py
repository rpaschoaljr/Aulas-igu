entrada = input().split()
p = int(entrada[0])
r = int(entrada[1])

if (p == 1 and r == 1):
    print("A")
elif (p == 1 and r == 0):   
    print("B")
elif (p == 0):
    print("C")