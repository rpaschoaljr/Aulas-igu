class Produto:
    def __init__(self, nome, codigo, preco, estoque):
        self.nome = nome
        self.codigo = codigo
        self.preco = preco
        self.estoque = estoque
        
    def mostrar(self):
        print(f"Nome: {self.nome}")
        print(f"Codigo: {self.codigo}")
        print(f"Preço: {self.preco}")
        print(f"Estoque: {self.estoque}")