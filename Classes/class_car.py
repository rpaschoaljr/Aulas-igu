class car:
    def __init__ (self, marca, ano, cor):
        self.marca = marca
        self.ano = ano
        self.cor = cor
    def buzinar(self):
        print("Buzinando...")
    def mostrar_informacoes(self):
        print(f"Marca: {self.marca}")
        print(f"Ano: {self.ano}")
        print(f"Cor: {self.cor}")