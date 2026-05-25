
import java.util.Scanner;
public class Leitura {
    public static void main(String[] args){

        Scanner scanner = new Scanner(System.in);
        System.out.println("Digite seu nome: ");
        String nome = scanner.nextLine();
        System.out.println("Digite sua idade: ");
        Integer idade = scanner.nextInt();    
        System.out.println("Digite sua altura: ");
        Double altura = scanner.nextDouble();
        System.out.println("Nome: " + nome + " Idade: " + idade + " Altura: " + altura);
        scanner.close(); // Lembre-se de fechar o scanner para evitar vazamento de recursos
   

    }
    
}
