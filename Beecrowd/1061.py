def calcular_duracao(dia_inicio, hora_inicio, minuto_inicio, segundo_inicio, dia_fim, hora_fim, minuto_fim, segundo_fim):
    total_segundos_inicio = dia_inicio * 24 * 3600 + hora_inicio * 3600 + minuto_inicio * 60 + segundo_inicio
    total_segundos_fim = dia_fim * 24 * 3600 + hora_fim * 3600 + minuto_fim * 60 + segundo_fim
    
    duracao_total_segundos = total_segundos_fim - total_segundos_inicio
    
    dias = duracao_total_segundos // (24 * 3600)
    duracao_total_segundos %= (24 * 3600)
    
    horas = duracao_total_segundos // 3600
    duracao_total_segundos %= 3600
    
    minutos = duracao_total_segundos // 60
    segundos = duracao_total_segundos % 60
    
    return dias, horas, minutos, segundos
entrada = input().split()
dia_inicio = int(entrada[1])
entrada = input().split(" : ")
hora_inicio = int(entrada[0])
minuto_inicio = int(entrada[1])
segundo_inicio = int(entrada[2])
entrada = input().split()
dia_fim = int(entrada[1])
entrada = input().split(" : ")
hora_fim = int(entrada[0])
minuto_fim = int(entrada[1])
segundo_fim = int(entrada[2])   

dias, horas, minutos, segundos = calcular_duracao(dia_inicio, hora_inicio, minuto_inicio, segundo_inicio, dia_fim, hora_fim, minuto_fim, segundo_fim)
print(f"{dias} dia(s)")
print(f"{horas} hora(s)")
print(f"{minutos} minuto(s)")
print(f"{segundos} segundo(s)")
