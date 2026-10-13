package com.laboratorio.laboratorio1.mappers;

import com.laboratorio.laboratorio1.dto.ProductoDTO;
import com.laboratorio.laboratorio1.model.Producto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import java.util.List;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ProductoMapper {

    @Mapping(target = "categoriaId", source = "categoria.id")
    ProductoDTO toDto(Producto producto);

    List<ProductoDTO> toDtoList(List<Producto> productos);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "categoria", ignore = true)
    Producto toEntity(ProductoDTO productoDTO);
}