import java.util.Scanner;

public class contagemRegressiva {
    public static void main(String[] args) {
        int numero;
        Scanner scanner = new Scanner(System.in);
        System.out.println("Digite um numero inteiro: ");
        numero = scanner.nextInt();
        scanner.close(); // Lembre-se de fechar o scanner para evitar vazamento de recursos
        System.out.print(numero + " ");
        for (int i = numero-1; i>= 0; i--){
            System.out.print(i + " ");
        }
        System.out.println("FIM!");
    }
}
