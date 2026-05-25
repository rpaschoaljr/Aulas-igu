import java.util.Scanner;

public class classificarIdade {
    public static void main(String[] args) {
        int idade;
        Scanner scanner = new Scanner(System.in);
        System.out.println("Digite a idade: ");
        idade = scanner.nextInt();
        scanner.close(); // Lembre-se de fechar o scanner para evitar vazamento de recursos
        if (idade >= 0 && idade <= 12) {
            System.out.println("Criança");
        } else if (idade >= 13 && idade <= 17){
            System.out.println("Adolescente");
        } else if (idade >= 18 && idade <= 59){
            System.out.println("Adulto");
        } else if (idade >= 60){
            System.out.println("Idoso");
        }
    }
}
        
    
