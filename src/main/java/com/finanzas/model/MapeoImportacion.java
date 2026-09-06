package com.finanzas.model;

import jakarta.persistence.*;

@Entity
@Table(name = "mapeos_importacion",
       uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "firma_encabezados"}))
public class MapeoImportacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "firma_encabezados", nullable = false, length = 2000)
    private String firmaEncabezados;

    @Column(name = "columna_fecha")
    private String columnaFecha;

    @Column(name = "columna_descripcion", nullable = false)
    private String columnaDescripcion;

    @Column(name = "columna_categoria")
    private String columnaCategoria;

    @Enumerated(EnumType.STRING)
    @Column(name = "modo_importe")
    private ModoImporte modoImporte;

    @Column(name = "columna_monto")
    private String columnaMonto;

    @Column(name = "columna_tipo")
    private String columnaTipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_fijo")
    private TipoTransaccion tipoFijo;

    @Column(name = "columna_monto_ingreso")
    private String columnaMontoIngreso;

    @Column(name = "columna_monto_gasto")
    private String columnaMontoGasto;

    @Column(name = "columna_descripcion_ingreso")
    private String columnaDescripcionIngreso;

    @Column(name = "columna_descripcion_gasto")
    private String columnaDescripcionGasto;

    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getFirmaEncabezados() { return firmaEncabezados; }
    public void setFirmaEncabezados(String firmaEncabezados) { this.firmaEncabezados = firmaEncabezados; }
    public String getColumnaFecha() { return columnaFecha; }
    public void setColumnaFecha(String columnaFecha) { this.columnaFecha = columnaFecha; }
    public String getColumnaDescripcion() { return columnaDescripcion; }
    public void setColumnaDescripcion(String columnaDescripcion) { this.columnaDescripcion = columnaDescripcion; }
    public String getColumnaCategoria() { return columnaCategoria; }
    public void setColumnaCategoria(String columnaCategoria) { this.columnaCategoria = columnaCategoria; }
    public ModoImporte getModoImporte() { return modoImporte; }
    public void setModoImporte(ModoImporte modoImporte) { this.modoImporte = modoImporte; }
    public String getColumnaMonto() { return columnaMonto; }
    public void setColumnaMonto(String columnaMonto) { this.columnaMonto = columnaMonto; }
    public String getColumnaTipo() { return columnaTipo; }
    public void setColumnaTipo(String columnaTipo) { this.columnaTipo = columnaTipo; }
    public TipoTransaccion getTipoFijo() { return tipoFijo; }
    public void setTipoFijo(TipoTransaccion tipoFijo) { this.tipoFijo = tipoFijo; }
    public String getColumnaMontoIngreso() { return columnaMontoIngreso; }
    public void setColumnaMontoIngreso(String columnaMontoIngreso) { this.columnaMontoIngreso = columnaMontoIngreso; }
    public String getColumnaMontoGasto() { return columnaMontoGasto; }
    public void setColumnaMontoGasto(String columnaMontoGasto) { this.columnaMontoGasto = columnaMontoGasto; }
    public String getColumnaDescripcionIngreso() { return columnaDescripcionIngreso; }
    public void setColumnaDescripcionIngreso(String columnaDescripcionIngreso) { this.columnaDescripcionIngreso = columnaDescripcionIngreso; }
    public String getColumnaDescripcionGasto() { return columnaDescripcionGasto; }
    public void setColumnaDescripcionGasto(String columnaDescripcionGasto) { this.columnaDescripcionGasto = columnaDescripcionGasto; }
}
