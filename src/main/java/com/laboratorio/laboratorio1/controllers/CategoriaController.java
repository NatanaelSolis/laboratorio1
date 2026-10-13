package com.laboratorio.laboratorio1.controllers;

import com.laboratorio.laboratorio1.model.Categoria;
import com.laboratorio.laboratorio1.service.CategoriaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.laboratorio.laboratorio1.dto.CategoriaDTO;
import com.laboratorio.laboratorio1.mappers.CategoriaMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    private final CategoriaService categoriaService;
    private final CategoriaMapper categoriaMapper;

    public CategoriaController(
            CategoriaService categoriaService,
            CategoriaMapper categoriaMapper
    ) {
        this.categoriaService = categoriaService;
        this.categoriaMapper = categoriaMapper;
    }

    @GetMapping
    public List<CategoriaDTO> findAll() {
        return categoriaMapper.toDtoList(categoriaService.findAll());
    }

    @PreAuthorize("hasRole('SUPER-ADMIN-ROLE')")
    @PostMapping
    public ResponseEntity<CategoriaDTO> create(
            @RequestBody CategoriaDTO categoriaDTO
    ) {
        Categoria categoria = categoriaMapper.toEntity(categoriaDTO);
        Categoria creada = categoriaService.create(categoria);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(creada.getId())
                .toUri();

        return ResponseEntity.created(location)
                .body(categoriaMapper.toDto(creada));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoriaDTO> findById(@PathVariable Long id) {
        return ResponseEntity.of(
                categoriaService.findById(id)
                        .map(categoriaMapper::toDto)
        );
    }

    @PreAuthorize("hasRole('SUPER-ADMIN-ROLE')")
    @PutMapping("/{id}")
    public ResponseEntity<CategoriaDTO> update(
            @PathVariable Long id,
            @RequestBody CategoriaDTO categoriaDTO
    ) {
        return ResponseEntity.of(
                categoriaService.update(
                        id,
                        categoriaMapper.toEntity(categoriaDTO)
                ).map(categoriaMapper::toDto)
        );
    }

    @PreAuthorize("hasRole('SUPER-ADMIN-ROLE')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return categoriaService.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
