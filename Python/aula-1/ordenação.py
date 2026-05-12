import time
import random

def bubble_sort(lista):
    n = len(lista)
    for i in range(n):
        for j in range(0, n-i-1):
            if lista[j] > lista[j+1]:
                aux = lista[j]
                lista[j] = lista[j+1]
                lista[j+1] = aux
                
def selection_sort(lista):
    n = len(lista)
    for i in range(n):
        indice_menor = i
        for j in range(i + 1, n):
            if lista[j] < lista[indice_menor]:
                indice_menor = j
        aux = lista[i]
        lista[i] = lista[indice_menor]
        lista[indice_menor] = aux
    
def insertion_sort(lista):
    n = len(lista)
    for i in range(1, n):
        chave = lista[i]
        j = i - 1
        while j >= 0 and lista[j] > chave:
            lista[j + 1] = lista[j]
        lista[j + 1] = chave

def python_sort(lista):
    lista.sort()

numeros = random.sample(range(10000), 10000)
inicio = time.time()
bubble_sort(numeros)
fim = time.time()


tempo_total = fim - inicio
print(f"Ordenação bubble concluída!")
print(f"Tempo levado: {tempo_total:.4f} segundos")

inicio = time.time()
selection_sort(numeros)
fim = time.time()

tempo_total = fim - inicio 
print(f"Ordenação selection concluída!")
print(f"Tempo levado: {tempo_total:.4f} segundos")

inicio = time.time()
insertion_sort(numeros)
fim = time.time()

tempo_total = fim - inicio 
print(f"Ordenação insertion concluída!")
print(f"Tempo levado: {tempo_total:.4f} segundos")

inicio = time.time()
python_sort(numeros)
fim = time.time()

tempo_total = fim - inicio
print(f"Ordenação Python concluída!")
print(f"Tempo levado: {tempo_total:.20f} segundos")