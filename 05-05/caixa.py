class Caixa:
    def __init__(self):
        self.produtos = []
        self.totalvendido = 0
        
    def adicionar(self, produto):
        self.produtos.append(produto)
        print(f"O produto {produto.nome} foi adiconado.")
        
    def listra_produtos(self):
        print(f"Produtos cadastrados:")
        for produto in self.produtos:
            produto.mostrar()
            
    def buscar_produto(self, codigo):
        for produto in self.produtos:
            if codigo == produto.codigo:
                return produto
        print("Produto não encontrado.")
        return False
    
    def vender(self, codigo, quantidade):
        produto = self.buscar_produto(codigo)
        if not produto:
            print(" tente outra vez.")
            return
        if quantidade > produto.estoque:
            print("Produto insuficiente")
            return 
        if produto and produto.estoque >= quantidade:
            total = quantidade * produto.preco
            print(f"Total da venda: {total}")
            produto.estoque -= quantidade
            self.totalvendido += total
                       
    def total_vendido(self):
        print(f"O total vendido foi de: {self.totalvendido}")

        