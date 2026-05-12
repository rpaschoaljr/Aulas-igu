idade_dia = int(input())
idade_ano = idade_dia // 365
dias_restantes = idade_dia - idade_ano * 365
idade_mes = dias_restantes // 30
dias_restantes = dias_restantes - idade_mes * 30
print(f'{idade_ano} ano(s)')
print(f'{idade_mes} mes(es)')
print(f'{dias_restantes} dia(s)')

