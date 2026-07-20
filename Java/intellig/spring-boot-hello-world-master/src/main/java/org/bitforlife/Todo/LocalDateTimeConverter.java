package org.bitforlife.Todo;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

@Converter(autoApply = true)
public class LocalDateTimeConverter implements AttributeConverter<LocalDateTime, String> {
    @Override
    public String convertToDatabaseColumn(LocalDateTime attr) {
        if (attr == null) return null;

        return String.valueOf(
                attr.atZone(ZoneId.systemDefault()).toEpochSecond()
        );
    }

    @Override
    public LocalDateTime convertToEntityAttribute(String attr) {
        if (attr == null) return null;
        long epochMilli = Long.parseLong(attr);
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMilli), ZoneOffset.UTC);
    }
}
