
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Scanner;



public class Main {
    public static void main(String[] args) {
        System.out.println("Bienvenido a tu app de gestión financiera de confianza");

        int opcion;
        do {
            System.out.println("======================================== \n"
                    + "             Menú principal\n"
                    + "========================================");

            System.out.println("1. Registrar ingreso \n"
                    + "2. Registrar gasto \n"
                    + "3. Establecer presupuesto mensual \n"
                    + "4. Definir un objetivo de ahorro \n"
                    + "5. Ver todos los movimientos \n"
                    + "6. Ver balance general \n"
                    + "7. Ver análisis por categoría\n"
                    + "========================================");

            System.out.print("Selecciona una opción: ");

            Scanner entrada = new Scanner(System.in);

            opcion = entrada.nextInt();
            entrada.nextLine();

            switch (opcion) {

                case 1:

                    registroDeIngreso();

                    break;

                case 2:


                    break;

                case 3:


                    break;

                case 4:


                    break;

                case 5:


                    break;

                case 6:


                    break;

                case 7:
                    System.out.print("Saliendo de la aplicación...");

                    break;


            }
        } while (opcion != 7);
    }

        private static void registroDeIngreso() {
            Scanner sc = new Scanner(System.in);
            String descripcion, categoria, fecha;
            int cantidad;
            System.out.print("Descripción: ");
            descripcion = sc.nextLine();
            System.out.print("Cantidad: ");
            cantidad = Integer.parseInt(sc.nextLine());
            // lo hago asi porque sino no hacia el salto de linea y lo hacia recien en categoria
            // no dejandome escribir nada en categoria
            System.out.print("Categoría: ");
            categoria = sc.nextLine();
            System.out.print("Fecha: ");
            fecha = sc.nextLine();
            guardarIngresos(descripcion,cantidad,categoria,fecha);
        }

    private static void guardarIngresos(String descripcion, int cantidad, String categoria, String fecha) {
        String ruta = "C:\\Nicolas\\Universidad\\ProyectosDeJava\\Gestor-de-Finanzas-Personal\\registro_ingresos.txt";
        PrintWriter salida = null;
        try {
            salida = new PrintWriter(new FileWriter(ruta, true));
            salida.println("Descripción: " + descripcion);
            salida.println("Cantidad: " + cantidad);
            salida.println("Categoría: " + categoria);
            salida.println("Fecha: " + fecha);
            salida.println("------------------------------------");
        } catch (IOException e) {
            System.out.println("⚠️ Error al guardar los datos: " + e.getMessage());
        } finally {
            if (salida != null) {
                salida.close();
            }
        }
    }


}