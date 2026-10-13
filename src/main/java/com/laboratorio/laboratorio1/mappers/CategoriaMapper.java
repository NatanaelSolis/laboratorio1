package com.laboratorio.laboratorio1.mappers;

import com.laboratorio.laboratorio1.dto.CategoriaDTO;
import com.laboratorio.laboratorio1.model.Categoria;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import java.util.List;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface CategoriaMapper {

    CategoriaDTO toDto(Categoria categoria);

    List<CategoriaDTO> toDtoList(List<Categoria> categorias);

    @Mapping(target = "id", ignore = true)
    Categoria toEntity(CategoriaDTO categoriaDTO);
}