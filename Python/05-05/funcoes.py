import os, time

def limpar():
    os.system("clear")
def marcar_tempo():
    horario = time.localtime()
    dia = horario.tm_mday
    mes = horario.tm_mon
    ano = horario.tm_year   
    hora = horario.tm_hour
    minuto = horario.tm_min
    segundo = horario.tm_sec
    hora_formatada = f"{dia}/{mes}/{ano} {hora}:{minuto}:{segundo}"   
    return hora_formatada
def verificar_numero(x):
    if x.isdigit():
        return float(x)
    else:
        limpar()
        print("Valor inválido. Digite um número.")    
        return
