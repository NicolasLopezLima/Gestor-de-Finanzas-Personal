
import com.sun.source.tree.WhileLoopTree;

import java.io.*;
import java.sql.SQLOutput;
import java.util.HashMap;
import java.util.Scanner;



public class Main {
    private static String rutaArchivoI ="C:\\Nicolas\\Universidad\\ProyectosDeJava\\Gestor-de-Finanzas-Personal\\registro_ingresos.txt";
    private static String rutaArchivoG ="C:\\Nicolas\\Universidad\\ProyectosDeJava\\Gestor-de-Finanzas-Personal\\registro_ingresos.txt";
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
                    registroDeIngreso(entrada);
                    break;

                case 2:
                    registroDeGastos(entrada);
                    break;
                case 3:
                    verMovimientos(entrada);
                    break;
                case 4:
                    balanceMensual();
                    break;

                case 5:
                    gestionDePresupuestos(entrada);
                    break;
                case 6:
                    analisisPorCategoria();
                    break;
                case 7:
                    System.out.print("Saliendo de la aplicación...");
                    break;
            }
        } while (opcion != 7);
    }

    /********************************************
     *  QUEDA MUCHO POR PENSAR EN ESTA FUNCION  *
     *******************************************/
    private static void analisisPorCategoria() {
        HashMap<String,Integer> ingresosPorCategoria = calcularIngresosPorCategoria(rutaArchivoI);
        HashMap<String,Integer> gastosPorCategoria = calcularGastosPorCategoria(rutaArchivoG);
        System.out.println();
        System.out.println("ANALISIS POR CATEGORIA");
        //while(){

        //}
    }

    private static HashMap<String, Integer> calcularGastosPorCategoria(String rutaArchivoG) {
        HashMap<String, Integer> gastosPorCategoria = new HashMap<>();
        try (BufferedReader br = new BufferedReader(new FileReader(rutaArchivoG))) {
            String linea;
            while ((linea = br.readLine()) != null) {
                String[] partes = linea.split(",");
                int monto = Integer.parseInt(partes[2]);
                String categoria = partes[3];
                gastosPorCategoria.putIfAbsent(categoria, monto);
                gastosPorCategoria.put(categoria, gastosPorCategoria.get(categoria) + monto);
            }
        } catch (IOException e) {
            System.out.println("Error al leer archivo: " + e.getMessage());
        }
        return gastosPorCategoria;
    }

    private static HashMap<String,Integer> calcularIngresosPorCategoria(String rutaArchivo) {
        HashMap<String, Integer> ingresosPorCategoria = new HashMap<>();
        try (BufferedReader br = new BufferedReader(new FileReader(rutaArchivo))) {
            String linea;
            while ((linea = br.readLine()) != null) {
                String[] partes = linea.split(",");
                int monto = Integer.parseInt(partes[2]);
                String categoria = partes[3];
                ingresosPorCategoria.putIfAbsent(categoria, monto);
                ingresosPorCategoria.put(categoria, ingresosPorCategoria.get(categoria) + monto);
            }

        } catch (IOException e) {
            System.out.println("Error al leer archivo: " + e.getMessage());
        }
        return ingresosPorCategoria;
    }

    /***************************
     * HASTA ACA ES EL CASO 6  *
     ***************************/
    private static void balanceMensual() {
        String archivoI="C:\\Nicolas\\Universidad\\ProyectosDeJava\\Gestor-de-Finanzas-Personal\\registro_ingresos.txt";
        String archivoG="C:\\Nicolas\\Universidad\\ProyectosDeJava\\Gestor-de-Finanzas-Personal\\registro_gastos.txt";
        System.out.println("BALANCE MENSUAL");
        System.out.println("Total ingresos: ");
        int ingresosTotales = calcularIngresosDelMes(archivoI);
        System.out.println(ingresosTotales+"$");
        System.out.println("Total gastos: ");
        int gastostotales = calcularGastosDelMes(archivoG);
        System.out.println(gastostotales+"$");
        int balance = calcularBalance(ingresosTotales,gastostotales);
        System.out.println("El balance es: "+balance+"$");
    }

    private static int calcularBalance(int ingresosTotales, int gastostotales) {
        return ingresosTotales+gastostotales;
    }

    private static int calcularIngresosDelMes(String rutaArchivo) {
        int monto=0;
        try (BufferedReader br = new BufferedReader(new FileReader(rutaArchivo))) {
            String linea;
            while ((linea = br.readLine()) != null) {
                String[] partes = linea.split(",");
                monto +=  Integer.parseInt(partes[2]);
            }
        } catch (IOException e) {
            System.out.println("Error al leer el archivo: " + e.getMessage());
        }
        return monto;
    }

    private static void gestionDePresupuestos(Scanner entrada) {
        int presupuesto = establecerPresupuesto(entrada);
        System.out.println("--> Presupuesto establecido correctamente.");
        System.out.println();
        System.out.println("Su presuouesto mensual son: "+presupuesto+"$");
        System.out.print("Los gastos del mes son: ");
        String rutaArchivo = "C:\\Nicolas\\Universidad\\ProyectosDeJava\\Gestor-de-Finanzas-Personal\\registro_gastos.txt";
        int gastoTotal = calcularGastosDelMes(rutaArchivo);
        System.out.println(gastoTotal+"$");
        System.out.print("Estado: ");
        int diferencia =presupuesto+gastoTotal;
        if (diferencia>=0)
            System.out.println("Dentro del limite (Restan "+diferencia+"$)");
        else System.out.println("Se ha superado el presupuesto por "+diferencia+"$");
    }

    private static int calcularGastosDelMes(String rutaArchivo) {
        int monto=0;
        try (BufferedReader br = new BufferedReader(new FileReader(rutaArchivo))) {
            String linea;
            while ((linea = br.readLine()) != null) {
                String[] partes = linea.split(",");
                monto +=  Integer.parseInt(partes[2]);
            }
        } catch (IOException e) {
            System.out.println("Error al leer el archivo: " + e.getMessage());
        }
        return monto;
    }

    private static int establecerPresupuesto(Scanner entrada) {
        System.out.print("Ingrese su presupuesto mensual: ");
        entrada = new Scanner(System.in);
        return entrada.nextInt();
    }

    private static void verMovimientos(Scanner entrada) {
        String rutaArchivo = null;
        System.out.println();
        System.out.println("VER MOVIMIENTOS");
        System.out.println("========================================");
        System.out.println("1. Ver movimiento por Ingreso");
        System.out.println("2. Ver movimiento por Gasto");
        System.out.print("Selecciona una opción: ");
        entrada = new Scanner(System.in);

        int opcion = entrada.nextInt();
        entrada.nextLine();
        switch (opcion){
            case 1:
                rutaArchivo = "C:\\Nicolas\\Universidad\\ProyectosDeJava\\Gestor-de-Finanzas-Personal\\registro_ingresos.txt";
                break;
            case 2:
                rutaArchivo = "C:\\Nicolas\\Universidad\\ProyectosDeJava\\Gestor-de-Finanzas-Personal\\registro_gastos.txt";
                break;
        }
        System.out.println("------------------------");
        leerMovimientosDesdeArchivo(rutaArchivo);
    }

    private static void leerMovimientosDesdeArchivo(String rutaArchivo) {
        try (BufferedReader br = new BufferedReader(new FileReader(rutaArchivo))) {
            String linea;
            while ((linea = br.readLine()) != null) {
                // Divide la línea en partes usando la coma como separador
                String[] partes = linea.split(",");
                System.out.println("Tipo: " + partes[1]);
                System.out.println("Descripción: " + partes[0]);
                System.out.println("Monto: " + Double.parseDouble(partes[2]));
                System.out.println("Categoría: " + partes[3]);
                System.out.println("Fecha: " + partes[4]);
                System.out.println("------------------------");
            }
        } catch (IOException e) {
            System.out.println("Error al leer el archivo: " + e.getMessage());
        }
    }

    private static void registroDeIngreso(Scanner sc) {
        sc = new Scanner(System.in);
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
        guardarMovimientos(descripcion,cantidad,categoria,fecha,true);
    }
    private static void registroDeGastos(Scanner sc) {
        sc = new Scanner(System.in);
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
        guardarMovimientos(descripcion,cantidad,categoria,fecha,false);
    }


    private static void guardarMovimientos(String descripcion, int cantidad, String categoria, String fecha, boolean esIngreso) {
        String ruta;
        if (esIngreso)
            ruta = "C:\\Nicolas\\Universidad\\ProyectosDeJava\\Gestor-de-Finanzas-Personal\\registro_ingresos.txt";
        else
            ruta = "C:\\Nicolas\\Universidad\\ProyectosDeJava\\Gestor-de-Finanzas-Personal\\registro_gastos.txt";

        PrintWriter salida = null;
        try {
            salida = new PrintWriter(new FileWriter(ruta, true));
            salida.print(descripcion+",");
            if (esIngreso) {
                salida.print("[INGRESO],");
                salida.print(cantidad + ",");
            }else{ salida.print("[GASTO],"); salida.print("-"+cantidad+","); }
            salida.print(categoria+",");
            salida.print(fecha);
            salida.println();
        } catch (IOException e) {
            System.out.println("⚠️ Error al guardar los datos: " + e.getMessage());
        } finally {
            if (salida != null) {
                salida.close();
            }
        }
    }


}