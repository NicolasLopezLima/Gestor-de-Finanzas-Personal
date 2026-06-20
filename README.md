# Gestor de Finanzas Personal

Aplicación web para gestionar tus finanzas personales — ingresos, gastos, presupuesto mensual, metas de ahorro e inversiones — todo en un solo lugar.

Nació de una necesidad concreta: llevaba mis finanzas en un cuaderno, lo cual se volvía incómodo y poco portable. Esta app reemplaza eso con algo accesible desde cualquier dispositivo, con los datos propios de cada usuario.

---

## ¿Qué hace?

### Ingresos & Gastos
Registrá transacciones del mes con categoría, tipo y día. El mes se puede cerrar al final del período para mantener el historial intacto.

### Presupuesto mensual
Dividí tu sueldo en categorías fijas (Gasto, Colchón, Inversión) y personalizadas. Se visualiza como un gráfico de dona interactivo con leyenda de montos y porcentajes.

### Metas financieras
Creá metas con un monto objetivo y fecha límite. Podés vincularlas a categorías del presupuesto y abonares mensualmente hasta completarlas.

### Cartera de inversiones
Registrá tus posiciones por tipo (Acciones, Oro, Bonos, Otro) con porcentaje objetivo en cartera y seguimiento del total invertido.

---

## Stack

**Backend**
- Java 21 + Spring Boot 3
- Spring Security + Google OAuth2
- Spring Data JPA + Hibernate
- MySQL

**Frontend**
- HTML / CSS / JavaScript vanilla
- SVG pie chart (sin librerías externas)
- SPA con fetch API

**Auth**
- Login con Google — cada usuario solo ve sus propios datos

---

## Instalación local

### Requisitos
- Java 21
- MySQL 8+
- Credenciales de Google OAuth2 ([guía](https://console.cloud.google.com/))

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/Gestor-de-Finanzas-Personal.git
cd Gestor-de-Finanzas-Personal
```

2. **Crear la base de datos**
```sql
CREATE DATABASE gestor_finanzas;
```

3. **Configurar variables de entorno**

En IntelliJ: Run → Edit Configurations → Environment variables:
```
DB_PASSWORD=tu_password_mysql
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
```

O si usás la terminal:
```bash
export DB_PASSWORD=tu_password_mysql
export GOOGLE_CLIENT_ID=tu_client_id
export GOOGLE_CLIENT_SECRET=tu_client_secret
```

4. **Correr la app**
```bash
./mvnw spring-boot:run
```

5. Abrí `http://localhost:8080` y logueate con Google.

> Las tablas se crean automáticamente al iniciar. No hace falta correr SQL adicional.

---

## Autor

Nicolás Lopez

---

## Licencia

MIT — libre para usar, modificar y compartir.
