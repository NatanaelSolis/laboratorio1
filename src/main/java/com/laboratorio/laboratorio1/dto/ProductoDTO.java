package com.laboratorio.laboratorio1.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProductoDTO(
        Long id,
        @NotBlank @Size(max = 100) String nombre,
        @NotBlank @Size(max = 255) String descripcion,
        @NotNull @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal precio,
        @NotNull @PositiveOrZero Integer cantidadStock,
        @NotNull @Positive Long categoriaId
) {
}
