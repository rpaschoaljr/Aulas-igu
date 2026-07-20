package org.bitforlife.Todo;


import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BooleanToIntegerConverter implements AttributeConverter<Boolean, Integer> {


    @Override
    public Integer convertToDatabaseColumn(Boolean attr) {
        return (attr != null && attr) ? 1 : 0;
    }

    @Override
    public Boolean convertToEntityAttribute(Integer attr) {
        return attr != null && attr == 1;
    }
}
