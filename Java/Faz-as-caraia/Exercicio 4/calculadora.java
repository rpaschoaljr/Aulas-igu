
import java.util.Scanner;
public class calculadora {
    public static void main(String[] args) {
        // Variáveis para armazenar os resultados
        Integer resultado = 0;
        Double resultado_float = 0.0;
        // Solicitar ao usuário os números para a operação
        System.out.println("Digite o primeiro número: ");
        Scanner scanner = new Scanner(System.in);
        Integer a = scanner.nextInt();
        System.out.println("Digite o segundo número: ");
        Integer b = scanner.nextInt();
        scanner.close(); // Lembre-se de fechar o scanner para evitar vazamento de recursos
        // Criar uma instância da calculadora e realizar as operações
        // A instancia é necessária para chamar os métodos não estáticos da classe
        calculadora calc = new calculadora();
        // Exibir os resultados das operações
        resultado = calc.soma(a, b);
        System.out.println("Soma: " + resultado);
        resultado = calc.subtracao(a, b);
        System.out.println("Subtração: " + resultado);
        resultado = calc.multiplicacao(a, b);
        System.out.println("Multiplicação: " + resultado);
        resultado_float = calc.divisao(a.doubleValue(), b.doubleValue());
        System.out.println("Divisão: " + resultado_float);
    }
    private Integer soma(Integer a, Integer b) {
        return a + b;
    }
    private Integer subtracao(Integer a, Integer b) {
        return a - b;
    }
    private Integer multiplicacao(Integer a, Integer b) {
        return a * b;
    }
    private Double divisao(Double a, Double b) {
        return a / b;
    }
}
