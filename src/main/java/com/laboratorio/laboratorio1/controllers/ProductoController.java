package com.laboratorio.laboratorio1.controllers;

import com.laboratorio.laboratorio1.dto.ProductoDTO;
import com.laboratorio.laboratorio1.mappers.ProductoMapper;
import com.laboratorio.laboratorio1.model.Producto;
import com.laboratorio.laboratorio1.service.ProductoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService productoService;
    private final ProductoMapper productoMapper;

    public ProductoController(
            ProductoService productoService,
            ProductoMapper productoMapper
    ) {
        this.productoService = productoService;
        this.productoMapper = productoMapper;
    }

    @GetMapping
    public List<ProductoDTO> findAll() {
        return productoMapper.toDtoList(productoService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductoDTO> findById(
            @PathVariable Long id
    ) {
        return ResponseEntity.of(
                productoService.findById(id)
                        .map(productoMapper::toDto)
        );
    }

    @PreAuthorize("hasRole('SUPER-ADMIN-ROLE')")
    @PostMapping
    public ResponseEntity<ProductoDTO> create(
            @RequestBody ProductoDTO productoDTO
    ) {
        Producto datos = productoMapper.toEntity(productoDTO);

        Producto creado = productoService.create(
                datos,
                productoDTO.categoriaId()
        );

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(creado.getId())
                .toUri();

        return ResponseEntity.created(location)
                .body(productoMapper.toDto(creado));
    }

    @PreAuthorize("hasRole('SUPER-ADMIN-ROLE')")
    @PutMapping("/{id}")
    public ResponseEntity<ProductoDTO> update(
            @PathVariable Long id,
            @RequestBody ProductoDTO productoDTO
    ) {
        return ResponseEntity.of(
                productoService.update(
                        id,
                        productoMapper.toEntity(productoDTO),
                        productoDTO.categoriaId()
                ).map(productoMapper::toDto)
        );
    }

    @PreAuthorize("hasRole('SUPER-ADMIN-ROLE')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return productoService.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}