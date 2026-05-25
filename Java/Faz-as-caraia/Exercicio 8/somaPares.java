import java.util.Scanner;

public class somaPares {
    public static void main(String[] args) {
        int resultado = 0;
        int numero;
        Scanner scanner = new Scanner(System.in);
        System.out.print("Digite um numero inteiro: ");
        numero = scanner.nextInt();
        scanner.close();
        for (int i = 0; i <= numero; i++){
            if(i % 2 == 0){
                resultado += i;       
            }
        }
        System.out.println("A soma dos números pares de 0 até " + numero + " é: " + resultado);

    }
    
}
