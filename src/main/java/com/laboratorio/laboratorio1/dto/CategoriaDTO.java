package com.laboratorio.laboratorio1.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoriaDTO(
        Long id,
        @NotBlank @Size(max = 100) String nombre,
        @NotBlank @Size(max = 255) String descripcion
) {
}
