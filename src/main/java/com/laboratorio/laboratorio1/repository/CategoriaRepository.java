package com.laboratorio.laboratorio1.repository;


import com.laboratorio.laboratorio1.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Long> { }