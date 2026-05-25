import java.util.Scanner;

public class tabuada {
    public static void main(String[] args) {
        int numero;
        Scanner scanner = new Scanner(System.in);
        System.out.print("Digite um numero inteiro: ");
        numero = scanner.nextInt();
        scanner.close();
        for (int i = 1; i <= 10; i++) {
            System.out.println(numero + " x " + i + " = " + (numero * i));
        }

    }
}
