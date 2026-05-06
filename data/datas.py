from datetime import date, datetime, timezone, timedelta


hoje = date.today()
dia = hoje.day
mes = hoje.month
ano = hoje.year

print(f"hoje: {hoje}")
print(f"dia: {dia}")
print(f"mes: {mes}")
print(f"ano: {ano}")

agora = datetime.now(timezone(timedelta(hours=-3)))
hora = agora.hour
minuto = agora.minute
segundo = agora.second

print(f"agora: {agora}")
print(f"hora: {hora}")
print(f"minuto: {minuto}")
print(f"segundo: {segundo}")