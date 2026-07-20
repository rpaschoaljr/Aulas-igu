package aula06.HashMap;
import java.util.Scanner;
import java.util.HashMap;

public class App {
    public static void main(String[] args) {
        HashMap<String, String> map = new HashMap<>();
        map.put("SP", "São Paulo");
        map.put("RJ", "Rio de Janeiro");
        map.put("PR", "Curitiba");


        Scanner scanner = new Scanner(System.in);
        System.out.print("Digite um estado: ");

            String estado = scanner.nextLine().toUpperCase();
            if (!map.containsKey(estado)) {
                System.out.println("Estado não encontrado no mapa.");
            }
            else{
                System.out.println("capital: " + map.get(estado));
        }

        scanner.close();
    }
    
}
