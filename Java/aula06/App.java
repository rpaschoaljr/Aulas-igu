package aula06;
import java.util.Scanner;
public class App {
    public static void main(String[] args){
        Scanner scanner = new Scanner(System.in);
        System.out.println("Digite um numero: ");
        int numero = scanner.nextInt();
        System.out.println("Voce digitou: " + numero);
        scanner.close();
    }
    
}
