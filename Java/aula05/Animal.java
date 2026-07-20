package aula05;
public class Animal {
    protected String nome;

    public Animal(String nome) {
        this.nome = nome;
    }

    public void dormir() {
        System.out.println(nome + " está dormindo...");
    }
}