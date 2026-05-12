import os

diretorio = "."
texto_começo = "arquivo"
texto_fim = ".txt"
for arquivo in os.listdir(diretorio):

    if arquivo.startswith(texto_começo) and arquivo.endswith(texto_fim):

        numero_str = arquivo.removeprefix(texto_começo).removesuffix(texto_fim)
        
        try:
            numero = int(numero_str)
            
            if numero % 2 == 0:
                texto = "Este arquivo tem número PAR."
            else:
                texto = "Este arquivo tem número ÍMPAR."
            
            with open(os.path.join(diretorio, arquivo), "w", encoding="utf-8") as f:
                f.write(texto)
                
            print(f"Processado: {arquivo} -> {texto}")
            
        except ValueError:

            print(f"Pulo: {arquivo} não contém um número válido no meio.")