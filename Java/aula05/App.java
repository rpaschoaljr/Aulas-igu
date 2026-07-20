package aula05;    
public class App {
    public static void main(String[] args) {
        Cachorro rex = new Cachorro("Rex");
        rex.dormir();
        rex.latir();

        Gato mimi = new Gato("Mimi");
        mimi.dormir();
        mimi.miar();
    }
}