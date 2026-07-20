package org.bitforlife.Companies;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table (name = "company")
@Getter
@Setter

public class Company {
    @Id
    @GeneratedValue (strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column (name = "name")
    private String name;

    public Company () {}

    public Company (Integer id, String name) {
        this.id = id;
        this.name = name;
    }

}
