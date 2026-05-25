import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Integer resultado = 0;
        Double resultado_float = 0.0;
        System.out.println("Digite o primeiro número: ");
        String nome;
        try (Scanner scanner = new Scanner(System.in)) {
            nome = scanner.nextLine();
        }
    }
    private Integer soma(Integer a, Integer b) {
        return a + b;
    }
    private Double divisao(Double a, Double b) {
        return a / b;
    }
    private Integer multiplicacao(Integer a, Integer b) {
        return a * b;
    }
    private Integer subtracao(Integer a, Integer b) {
        return a - b;
    }
}