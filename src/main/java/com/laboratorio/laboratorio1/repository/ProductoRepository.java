package com.laboratorio.laboratorio1.repository;

import com.laboratorio.laboratorio1.model.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductoRepository
        extends JpaRepository<Producto, Long> {
}