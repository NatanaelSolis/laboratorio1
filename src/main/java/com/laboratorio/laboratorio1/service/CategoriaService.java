package com.laboratorio.laboratorio1.service;

import com.laboratorio.laboratorio1.model.Categoria;
import com.laboratorio.laboratorio1.repository.CategoriaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;


    public CategoriaService(CategoriaRepository categoriaRepository) {
        this.categoriaRepository = categoriaRepository;
    }


    public List<Categoria> findAll() {return categoriaRepository.findAll();}

    public Categoria create(Categoria categoria) {
        Categoria nueva = new Categoria(
                categoria.getNombre(),
                categoria.getDescripcion()
        );
        return categoriaRepository.save(nueva);
    }

    public Optional<Categoria> findById(Long id) {
        return categoriaRepository.findById(id);
    }

    @Transactional
    public Optional<Categoria> update(Long id, Categoria datos) {
        return categoriaRepository.findById(id).map(categoria -> {
            categoria.setNombre(datos.getNombre());
            categoria.setDescripcion(datos.getDescripcion());
            return categoriaRepository.save(categoria);
        });
    }

    @Transactional
    public boolean delete(Long id) {
        if (!categoriaRepository.existsById(id)) {
            return false;
        }

        categoriaRepository.deleteById(id);
        return true;
    }

}


