package com.laboratorio.laboratorio1.model;


import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nombre;
    private String descripcion;

    protected Categoria(){}

    public Categoria(String nombre, String descripcion){
        this.nombre = nombre;
        this.descripcion = descripcion;
    }


    @Override
    public String toString() {
        return String.format(
                "Categoria[id=%d, nombre='%s', descripcion='%s']",
                id, nombre, descripcion);
    }

    public Long getId(){
        return id;
    }

    public String getNombre(){
        return nombre;
    }

    public String getDescripcion(){
        return descripcion;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }
}
