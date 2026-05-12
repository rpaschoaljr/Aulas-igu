while True:
    try:

        n = int(input())
        
        for i in range(n):
            for j in range(n):

                if i + j == n - 1:
                    valor = 2
                elif i == j:
                    valor = 1
                else:
                    valor = 3
                print(valor, end="")
            print()
            
    except EOFError:
        break