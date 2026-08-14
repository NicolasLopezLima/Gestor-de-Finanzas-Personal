package com.finanzas.config;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Este proyecto no tiene Flyway/Liquibase — el esquema se maneja con ddl-auto=update, que solo
 * agrega tablas/columnas nuevas y nunca modifica el tipo de una columna existente. Las columnas
 * "tipo" de transacciones/transacciones_fijas quedaron como ENUM('INGRESO','GASTO') nativo de
 * MySQL de una creación anterior, y ahora rechazan el nuevo valor 'META' con "Data truncated".
 * Se ensanchan a VARCHAR una sola vez al arrancar — MODIFY COLUMN es idempotente, así que no
 * hay problema en que corra en cada arranque mientras esta clase siga en el proyecto.
 */
@Component
public class OneTimeSchemaFix {

    private final JdbcTemplate jdbcTemplate;

    public OneTimeSchemaFix(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void ampliarColumnaTipo() {
        jdbcTemplate.execute("ALTER TABLE transacciones MODIFY COLUMN tipo VARCHAR(20) NOT NULL");
        jdbcTemplate.execute("ALTER TABLE transacciones_fijas MODIFY COLUMN tipo VARCHAR(20) NOT NULL");
        // Mismo problema: "categorias.tipo" nunca se probó con más que INGRESO/GASTO hasta ahora
        // (META no pasa por esta tabla), y con INVERSION sumándose como categoría elegible se
        // pisaría el mismo ENUM nativo.
        jdbcTemplate.execute("ALTER TABLE categorias MODIFY COLUMN tipo VARCHAR(20) NOT NULL");
        // Mismo problema otra vez: "inversiones.tipo"/"mercado" quedaron como ENUM nativo con los
        // 4/2 valores originales (ACCIONES/BONOS/ORO/OTRO, EEUU/ARGENTINA) — FONDO y EUROPA
        // truncarían igual que META truncaba antes en transacciones.
        jdbcTemplate.execute("ALTER TABLE inversiones MODIFY COLUMN tipo VARCHAR(20) NOT NULL");
        jdbcTemplate.execute("ALTER TABLE inversiones MODIFY COLUMN mercado VARCHAR(20)");
        // "cantidad" pasó de 4 a 6 decimales — ddl-auto=update no ensancha la escala de una
        // columna DECIMAL existente, hay que hacerlo a mano igual que con los ENUM de arriba.
        jdbcTemplate.execute("ALTER TABLE inversiones MODIFY COLUMN cantidad DECIMAL(17,6)");
    }
}
